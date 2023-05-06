const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');
const http = require('http');

require('colors');
const host = 'localhost';
const port = 3000;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function readeFile(pathToFile, type) {
    if (path.extname(pathToFile) !== type) {
        throw new Error(
            `You should provide us a path to file with ${type} extension`
        );
    }
    const data = await fs.readFile(pathToFile);
    return data;
}
const getTupleOfKeyAndItsValue = (json, q) => {
    const value = getValueFromJson(json, q);
    return [q, value];
};

const getValueFromJson = (json, q) => {
    const parsedQuery = q.split('.');
    const closestElement = parsedQuery[0];
    if (!closestElement) {
        return '';
    }

    return typeof json[closestElement] === 'object' &&
        !Array.isArray(json[closestElement])
        ? getValueFromJson(json[closestElement], parsedQuery.slice(1).join('.'))
        : json[closestElement];
};
const getVariablesFromTemplate = (t) => {
    const regExp = /[^{\}]+(?=})/g;
    if (!t.match(regExp)) {
        return [];
    }
    return [...t.match(regExp)];
};
const makeHTMLMarkUp = (tuples, template) => {
    let result = String(template);
    tuples.forEach((tuple) => {
        const updatedResult = result.replace(tuple[0], tuple[1]);
        result = updatedResult;
    });

    return result.replace(/[{}]/g, '');
};
const updateHTML = async (path, template) => {
    fs.writeFile(path, template);
};
const getRequestString = (s) => `Enter the path to the ${s} file: `;
const app = () => {
    rl.question(`${getRequestString('HTML')}`.yellow, async (r) => {
        try {
            const pathToTemplate = path.normalize(r);
            const htmlData = (
                await readeFile(pathToTemplate, '.html')
            ).toString();

            const matches = getVariablesFromTemplate(htmlData);

            rl.question(`${getRequestString('JSON')}`.yellow, async (r) => {
                try {
                    const pathToJSON = path.normalize(r);
                    const jsonData = JSON.parse(
                        (await readeFile(pathToJSON, '.json')).toString()
                    );
                    const arrayOfKeyValueTuples = matches.map((k) =>
                        getTupleOfKeyAndItsValue(jsonData, k)
                    );
                    const markup = makeHTMLMarkUp(
                        arrayOfKeyValueTuples,
                        htmlData
                    );

                    await updateHTML(pathToTemplate, markup);
                    const requestListener = async function (_, res) {
                        try {
                            const contents = await fs.readFile(pathToTemplate);
                            res.setHeader('Content-Type', 'text/html');
                            res.writeHead(200);
                            res.end(contents);
                        } catch (error) {
                            res.writeHead(500);
                            res.end(error);
                            return;
                        }
                    };
                    const server = http.createServer(requestListener);

                    await server.listen(port, host, () => {
                        console.log(
                            `Server is running on http://${host}:${port}`
                        );
                    });
                } catch (e) {
                    console.log(`${e.message}: `.red);
                    rl.close();
                }
            });
        } catch (e) {
            console.log(`${e.message}: `.red);
            rl.close();
        }
    });
};
app();
