import { commands, DecorationOptions, Location, Position, Range, TextDocument, TextEditor, ThemeColor, Uri, window } from "vscode";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as recast from "recast";
import configuration from "./configuration";
import { getRenamingTypes, Renaming } from "./models";
import { createAnnotation, getVisibleRows, SUPPORTED_LANGUAGES } from "./utils";
import { Identifier, MemberExpression, SourceLocation } from "@babel/types";
import { Settings } from "./settings";

const renamingHideDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.background"),
    color: new ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const renamingDecorationType = window.createTextEditorDecorationType({});
const highlightVisibleDefinitionsDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.wordHighlightBackground"),
    borderColor: new ThemeColor("editor.wordHighlightBorder"),
});
const highlightNotVisibleDefinitionsDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.wordHighlightBackground"),
    borderColor: new ThemeColor("editor.wordHighlightBorder")
});

const refreshRenamings = async (editor: TextEditor | undefined, currentlySelectedPositions: Position[] | undefined = undefined) => {
    if (editor) {
        if (!Settings.isRenamingEnabled()) {
            editor.setDecorations(renamingHideDecorationType, []);
            editor.setDecorations(renamingDecorationType, []);
            return;
        }
        const result: Renaming[] = [];
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const fileConfig = await configuration.getMergedConfigurationForCurrentFile(editor.document.uri)
            if (fileConfig) {
                const renamings = fileConfig.renamings;
                if (fileConfig.fileRenaming || renamings) {
                    const nodes: { name: string, range: Range }[] = [];
                    const ast = parse(editor.document.getText());
                    if (!ast)
                        return;
                    const originalNames: string[] = renamings ? Object.keys(renamings) : [];
                    traverse(ast, {
                        enter(path) {
                            if (path.isIdentifier()) {
                                if (fileConfig.fileRenaming || originalNames.includes(path.node.name)) {
                                    const loc = path.node.loc!;
                                    const range: Range = getRangeFromLoc(loc);
                                    if (currentlySelectedPositions && currentlySelectedPositions.find(x => x.line === range.start.line)) {
                                        //skip this "renaming"
                                    } else {
                                        nodes.push({ name: path.node.name, range: range });
                                    }
                                }
                            }
                        }
                    });
                    const renamingTypes = getRenamingTypes();
                    for (const node of nodes) {
                        if (originalNames.includes(node.name)) {
                            const renaming = renamings![node.name]!;
                            const renamingType = renamingTypes.find(x => x.id === renaming.renamingTypeId)!;
                            result.push(new Renaming(node.name, renaming.newName, renamingType, node.range));
                        } else {
                            const renamingType = renamingTypes.find(x => x.id === fileConfig.fileRenaming)
                            if (renamingType?.getNewNameFunction) {
                                const newName = await renamingType.getNewNameFunction(node.name, undefined);
                                if (newName)
                                    result.push(new Renaming(node.name, newName, renamingType, node.range));
                            }
                        }
                    }
                }
            }
        }
        //Hide original identifiers
        editor.setDecorations(renamingHideDecorationType, result);

        //"Rename" original identifier by adding the "new" name as annotation
        const annotations = result.map(i => createAnnotation(i.newName, i.range));
        editor.setDecorations(renamingDecorationType, annotations);
    }
};

const highlightSymbolDefinitions = async (editor: TextEditor | undefined, currentlySelectedPositions: Position[]) => {
    if (editor && SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
        const ranges: [Range, Range][] = [];
        for (let position of currentlySelectedPositions) {
            const ast = parse(editor.document.getText());
            if (!ast)
                return;
            const nodes: Identifier[] = [];
            traverse(ast, {
                enter(path) {
                    if (path.isIdentifier() && path.node.loc && path.node.loc.start.line - 1 === position.line)
                        nodes.push(path.node);
                }
            });
            for (let node of nodes) {
                if (node.loc) {
                    const definitions = await commands.executeCommand<Location[]>(
                        "vscode.executeDefinitionProvider",
                        editor.document.uri,
                        getRangeFromLoc(node.loc).start
                    );
                    if (definitions) {
                        for (let definition of definitions) {
                            const uri = (definition as any).targetUri as Uri;
                            const range = (definition as any).targetSelectionRange as Range;
                            if (!uri || !range?.start)
                                continue;
                            if (uri.path === editor.document.uri.path)
                                if (range.start.line !== position.line)
                                    ranges.push([getRangeFromLoc(node.loc), range]);
                        }
                    }
                }
            }
        };
        const visibleRows = getVisibleRows(editor, editor.visibleRanges);
        const visibleRanges: Range[] = [];
        const notVisibleRanges: DecorationOptions[] = [];
        for (let range of ranges) {
            if (visibleRows.has(range[1].start.line))
                visibleRanges.push(range[1]);
            else
                notVisibleRanges.push(createAnnotation(` [D-Line ${range[1].start.line + 1}]`, range[0], "after"));
        }
        editor.setDecorations(highlightVisibleDefinitionsDecorationType, visibleRanges);
        editor.setDecorations(highlightNotVisibleDefinitionsDecorationType, notVisibleRanges);
    }
};

const getFunctionDeclarations = (document: TextDocument): Range[] => {
    const ast = parse(document.getText());
    if (!ast)
        return [];
    const ranges: Range[] = [];
    traverse(ast, {
        ArrowFunctionExpression: function (path) {
            if (path.node.loc)
                ranges.push(getRangeFromLoc(path.node.loc));
        },
        FunctionDeclaration: function (path) {
            if (path.node.loc)
                ranges.push(getRangeFromLoc(path.node.loc));
        },
        FunctionExpression: function (path) {
            if (path.node.loc)
                ranges.push(getRangeFromLoc(path.node.loc));
        },
        ClassMethod: function (path) {
            if (path.node.loc)
                ranges.push(getRangeFromLoc(path.node.loc));
        }
    });
    return ranges;
};


const getSymbolPosition = (editor: TextEditor | undefined, name: string): Position | undefined => {
    let result: Position | undefined = undefined;
    if (editor) {
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const ast = parse(editor.document.getText());
            if (!ast)
                return result;
            traverse(ast, {
                enter(path) {
                    if (path.isIdentifier() && path.node.name === name) {
                        result = new Position(path.node.loc!.start.line - 1, path.node.loc!.start.column);
                        path.stop();
                    }
                }
            });
        }
    }
    return result;
};


const checkIfNameIsACodeSymbol = (editor: TextEditor, name: string): boolean => {
    let result = false;
    const ast = parse(editor.document.getText());
    if (!ast)
        return result;
    traverse(ast, {
        enter(path) {
            if (path.isIdentifier() && path.node.name === name) {
                result = true;
                path.stop();
            }
        }
    });
    return result;
};

const getRangeOfFunctionSymbol = (editor: TextEditor, name: string): Range | undefined => {
    let result: Range | undefined = undefined;
    const ast = parse(editor.document.getText());
    if (!ast)
        return result;
    traverse(ast, {
        enter(path) {
            if (path.isVariableDeclarator() && path.node.loc && path.node.id.type === "Identifier" && path.node.id?.name === name && path.node.init && (path.node.init.type === "ArrowFunctionExpression" || path.node.init.type === "FunctionExpression")) {
                result = getRangeFromLoc(path.node.loc);
                path.stop();
            }
            if (path.isFunctionDeclaration() && path.node.loc && path.node.id?.type === "Identifier" && path.node.id?.name === name) {
                result = getRangeFromLoc(path.node.loc);
                path.stop();
            }
            if (path.isClassMethod() && path.node.loc && path.node.key?.type === "Identifier" && path.node.key?.name === name) {
                result = getRangeFromLoc(path.node.loc);
                path.stop();
            }
            if (path.isAssignmentExpression() && path.node.left.type === "MemberExpression" && (path.node.left as MemberExpression).property?.type === "Identifier" && ((path.node.left as MemberExpression).property as Identifier).name === name && (path.node.right.type === "FunctionExpression" || path.node.right.type === "ArrowFunctionExpression") && path.node.right.loc) {
                result = getRangeFromLoc(path.node.right.loc);
                path.stop();
            }
        }
    });
    return result;
};

const getRangeFromLoc = (loc: SourceLocation): Range => {
    return new Range(
        new Position(loc.start.line - 1, loc.start.column),
        new Position(loc.end.line - 1, loc.end.column)
    );
};

const parse = (code: string) => {
    try {
        return recast.parse(code, {
            parser: {
                parse: (source: string) =>
                    babelParse(source, {
                        sourceType: "module",
                        allowImportExportEverywhere: true,
                        allowReturnOutsideFunction: true,
                        startLine: 1,
                        tokens: true,
                        plugins: [
                            "asyncGenerators",
                            "bigInt",
                            "classPrivateMethods",
                            "classPrivateProperties",
                            "classProperties",
                            "decorators-legacy",
                            "doExpressions",
                            "dynamicImport",
                            "exportDefaultFrom",
                            "exportNamespaceFrom",
                            "functionBind",
                            "functionSent",
                            "importMeta",
                            "jsx",
                            "logicalAssignment",
                            "nullishCoalescingOperator",
                            "numericSeparator",
                            "objectRestSpread",
                            "optionalCatchBinding",
                            "optionalChaining",
                            "partialApplication",
                            ["pipelineOperator", { proposal: "minimal" }],
                            "placeholders",
                            "throwExpressions",
                            "topLevelAwait",
                            "typescript"
                        ]
                    })
            },
            tabWidth: 1
        });
    } catch (error) {
        console.error(error);
    }
};

export default { checkIfNameIsACodeSymbol, getRangeOfFunctionSymbol, getFunctionDeclarations, refreshRenamings, highlightSymbolDefinitions, getSymbolPosition };