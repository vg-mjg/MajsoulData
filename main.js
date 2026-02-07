const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_URL = 'https://game.maj-soul.com/1/';

async function fetchData(url, responseType = 'json') {
    try {
        console.log(`Fetching ${url}`);
        const response = await axios.get(url, {
            responseType,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Request failed for ${url}: ${error.message}`);
        return null;
    }
}

async function downloadAndSaveResource(baseUrl, resourceManifest, resourcePath) {
    const resourceInfo = resourceManifest[resourcePath];
    if (!resourceInfo || !resourceInfo.prefix) {
        console.error(`Could not find prefix for ${resourcePath} in resversion.json`);
        return;
    }

    const prefix = resourceInfo.prefix;
    const finalUrl = `${baseUrl}${prefix}/${resourcePath}`;
    const outputFilename = path.basename(resourcePath);
    const responseType = outputFilename.endsWith('.lqbin') ? 'arraybuffer' : 'json';

    const data = await fetchData(finalUrl, responseType);
    if (data === null) return;

    try {
        const dataToSave = (responseType === 'json' && typeof data === 'object')
            ? JSON.stringify(data, null, 2)
            : data;
        await fs.writeFile(outputFilename, dataToSave);
        console.log(`Successfully saved ${outputFilename}`);
    } catch (error) {
        console.error(`Failed to write file ${outputFilename}: ${error.message}`);
    }
}

async function main() {
    console.log(`Using Base URL: ${BASE_URL}`);
    const randomValue = Math.floor(Math.random() * 1e9);

    // 1. Get Version
    const versionJson = await fetchData(`${BASE_URL}version.json?randv=${randomValue}`);
    if (!versionJson || !versionJson.version) {
        console.error('Failed to fetch version.json');
        return;
    }
    const version = versionJson.version;
    console.log(`Found game version: ${version}`);
    await fs.writeFile('version.txt', version);

    // Save version.json and resversion.json to /web directory
    const webDir = path.join(__dirname, 'web');
    const dataDir = path.join(__dirname, 'web', 'data');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(webDir, 'version.json'), JSON.stringify(versionJson, null, 2));

    // 2. Get ResVersion
    const resVersionJson = await fetchData(`${BASE_URL}resversion${version}.json`);
    if (!resVersionJson || !resVersionJson.res) {
        console.error('Failed to fetch resversion.json');
        return;
    }

    await fs.writeFile(path.join(webDir, 'resversion.json'), JSON.stringify(resVersionJson, null, 2));

    console.log('Resource manifest loaded and saved.');
    const resourceManifest = resVersionJson.res;

    // 3. Download critical data files
    const filesToDownload = ['res/proto/liqi.json', 'res/config/lqc.lqbin', 'res/proto/config.proto'];
    console.log('\nStarting info downloads...');
    await Promise.all(filesToDownload.map(filePath => downloadAndSaveResource(BASE_URL, resourceManifest, filePath)));

    // 4. Convert liqi.json to proto & generate docs
    console.log('\nProcessing liqi.json...');
    const liqiJsonPath = 'liqi.json';
    const liqiProtoPath = 'liqi.proto';

    try {
        const liqiJson = JSON.parse(await fs.readFile(liqiJsonPath, 'utf8'));
        let protoContent = 'syntax = "proto3";\n\npackage lq;\n\n';

        const convert = (obj, name, indent = 0) => {
            const pad = '  '.repeat(indent);
            if (obj.values) {
                const lines = Object.entries(obj.values)
                    .map(([enumName, enumValue]) => `${pad}  ${enumName} = ${enumValue};`)
                    .join('\n');
                return `${pad}enum ${name} {\n${lines}\n${pad}}\n\n`;
            }
            if (obj.methods) {
                const lines = Object.entries(obj.methods)
                    .map(([methodName, methodDef]) => {
                        const requestType = methodDef.requestType || 'google.protobuf.Empty';
                        const responseType = methodDef.responseType || 'google.protobuf.Empty';
                        return `${pad}  rpc ${methodName} (${requestType}) returns (${responseType});`;
                    })
                    .join('\n');
                return `${pad}service ${name} {\n${lines}\n${pad}}\n\n`;
            }
            let body = '';
            if (obj.fields) {
                body += Object.entries(obj.fields)
                    .map(([fieldName, fieldDef]) => {
                        const repeated = fieldDef.rule === 'repeated' ? 'repeated ' : '';
                        const optional = fieldDef.rule === 'optional' ? 'optional ' : '';
                        const rule = repeated || optional;
                        return `${pad}  ${rule}${fieldDef.type} ${fieldName} = ${fieldDef.id};`;
                    })
                    .join('\n');
                if (body) body += '\n';
            }
            if (obj.nested) {
                body += Object.entries(obj.nested)
                    .map(([nestedName, nestedObj]) => convert(nestedObj, nestedName, indent + 1))
                    .filter(Boolean)
                    .join('');
            }
            return `${pad}message ${name} {\n${body}${pad}}\n\n`;
        };

        if (liqiJson.nested && liqiJson.nested.lq && liqiJson.nested.lq.nested) {
            for (const [entityName, entityObj] of Object.entries(liqiJson.nested.lq.nested)) {
                protoContent += convert(entityObj, entityName);
            }
        }

        await fs.writeFile(liqiProtoPath, protoContent);
        console.log('liqi.proto generated.');

        // Generate Documentation
        console.log('Generating API documentation...');
        const pluginPath = [
            process.env.PROTOC_GEN_DOC_PATH,
            path.join(__dirname, process.platform === 'win32' ? 'protoc-gen-doc.exe' : 'protoc-gen-doc'),
        ].filter(Boolean).find(candidate => fsSync.existsSync(candidate));

        const docArgs = ['--proto_path=.'];
        if (pluginPath) docArgs.push(`--plugin=protoc-gen-doc=${pluginPath}`);

        await fs.mkdir('docs', { recursive: true });
        docArgs.push('--doc_out=docs', '--doc_opt=markdown,README.md', 'liqi.proto');

        try {
            execFileSync('protoc', docArgs, { stdio: 'inherit' });
            console.log('Documentation generated in docs/README.md');
        } catch (docError) {
            console.warn('Docs generation failed (protoc missing?):', docError.message);
        }

    } catch (e) {
        console.error('Proto processing failed:', e);
    }

    // 5. Process lqc.lqbin (Extract Game Data)
    console.log('\nProcessing lqc.lqbin...');
    const configProtoPath = path.join(__dirname, 'config.proto');
    const lqcBinPath = path.join(__dirname, 'lqc.lqbin');
    const protobuf = require('protobufjs');

    try {
        const root = await protobuf.load(configProtoPath);
        const ConfigTables = root.lookupType("lq.config.ConfigTables");
        const lqcBuffer = await fs.readFile(lqcBinPath);
        const configTable = ConfigTables.decode(lqcBuffer);

        console.log('Building schema from config...');
        const toClassName = (...parts) => parts.join('_').split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

        // Build dynamic proto
        let newProto = 'syntax = "proto3";\n\n';
        for (const schema of configTable.schemas) {
            for (const sheet of schema.sheets) {
                const className = toClassName(schema.name, sheet.name);
                const fields = sheet.fields.map(f => {
                    const repeated = f.arrayLength > 0 ? 'repeated ' : '';
                    return `  ${repeated}${f.pbType} ${f.fieldName} = ${f.pbIndex};`;
                }).join('\n');
                newProto += `message ${className} {\n${fields}\n}\n\n`;
            }
        }

        const parsedRoot = protobuf.parse(newProto).root;

        console.log('Exporting JSON data...');
        for (const data of configTable.datas) {
            if (!data.data?.length) continue;

            const className = toClassName(data.table, data.sheet);
            const klass = parsedRoot.lookupType(className);
            if (!klass) continue;

            const jsonData = data.data.reduce((acc, fieldMsg) => {
                try {
                    const decoded = klass.decode(fieldMsg);
                    const row = klass.toObject(decoded, { defaults: true, arrays: true, longs: String, enums: Number });
                    acc.push(row);
                } catch (e) { }
                return acc;
            }, []);

            await fs.writeFile(path.join(dataDir, `${className}.json`), JSON.stringify(jsonData, null, 4));
            // User feedback
            if (className === 'ItemDefinitionCharacter') console.log(`> Exported characters (${jsonData.length})`);
            if (className === 'ChestChestShop') console.log(`> Exported chest shop (${jsonData.length})`);
        }
        console.log('Data export complete.');

    } catch (e) {
        console.error('lqc processing failed:', e);
    }

    console.log('\nAll tasks complete.');
}

main();
