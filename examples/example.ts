var testVariable: string = "Hallo";
testVariable = "";

const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2: string = "Ciao";

function test123(a, b, ...c): void {
    console.log(a, b, ...c);
};

const test456 = (x: string): void => {
    console.log(x);
};

test123('Foo', 'bar', 1, 2, 3, 4);

console.log('a', 'b', 'c', 'd', 'e');

console.log("das ist ein test");

function greet (userName) {
    console.log("Good morning " + userName);
}

console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2);

const formatDateTimeForExport = (value) => {
    if (value) {
        const date = new Date(value);
        let day = date.getDate().toString();
        if (day.length === 1) day = `0${day}`;
        let month = (date.getMonth() + 1).toString();
        if (month.length === 1) month = `0${month}`;
        let hours = date.getHours().toString();
        if (hours.length === 1) hours = `0${hours}`;
        let minutes = date.getMinutes().toString();
        if (minutes.length === 1) minutes = `0${minutes}`;
        return `${date.getFullYear()}-${month}-${day}_${hours}-${minutes}`;
    }
    return "";
};
