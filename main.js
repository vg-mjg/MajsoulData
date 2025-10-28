const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function fetchData(url, responseType = 'json') {
    try {
        console.log(`Fetching ${url}`);
        const response = await axios.get(url, { responseType });
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

    if (data === null) {
        console.error(`Failed to fetch ${outputFilename}`);
        return;
    }

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
    const baseUrl = 'https://game.maj-soul.net/1/';
    const randomValue = Math.floor(Math.random() * 1e9) + Math.floor(Math.random() * 1e9);

    const versionJson = await fetchData(`${baseUrl}version.json?randv=${randomValue}`);
    if (!versionJson || !versionJson.version) {
        console.error('Failed to fetch version.json or it is invalid.');
        process.exit(1);
    }
    const version = versionJson.version;
    console.log(`Found game version: ${version}`);
    
    await fs.writeFile('version.txt', version);

    const resVersionJson = await fetchData(`${baseUrl}resversion${version}.json`);
    if (!resVersionJson || !resVersionJson.res) {
        console.error('Failed to fetch resversion.json or it is invalid.');
        process.exit(1);
    }
    const resourceManifest = resVersionJson.res;
    console.log('Resource manifest loaded.');

    const filesToDownload = ['res/proto/liqi.json', 'res/config/lqc.lqbin', 'res/proto/config.proto'];

    console.log('\nStarting downloads...');
    await Promise.all(filesToDownload.map(filePath => downloadAndSaveResource(baseUrl, resourceManifest, filePath)));

    console.log('\nConverting liqi.json to liqi.proto...');
    const liqiJsonPath = path.join(__dirname, 'liqi.json');
    const liqiProtoPath = path.join(__dirname, 'liqi.proto');
    const docsDir = path.join(__dirname, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    
    try {
        const liqiJson = JSON.parse(await fs.readFile(liqiJsonPath, 'utf8'));
        let protoContent = 'syntax = "proto3";\n\n';
        protoContent += 'package lq;\n\n';
        
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
        console.log('liqi.proto generated successfully.');
        
        console.log('Generating API documentation...');
        const { execFileSync } = require('child_process');

        const pluginPath = [
            process.env.PROTOC_GEN_DOC_PATH,
            path.join(__dirname, process.platform === 'win32' ? 'protoc-gen-doc.exe' : 'protoc-gen-doc'),
        ].filter(Boolean).find(candidate => fsSync.existsSync(candidate));

        const docArgs = ['--proto_path=.'];
        if (pluginPath) {
            docArgs.push(`--plugin=protoc-gen-doc=${pluginPath}`);
        }
        docArgs.push('--doc_out=docs', '--doc_opt=html,index.html', 'liqi.proto');

        try {
            execFileSync('protoc', docArgs, { stdio: 'inherit' });
            console.log('API documentation generated successfully in docs/index.html');
        } catch (docError) {
            console.error('Failed to generate documentation:', docError.message);
        }
        
    } catch (protoError) {
        console.error('Failed to convert liqi.json to proto:', protoError);
    }

    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    const configProtoPath = path.join(__dirname, 'config.proto');
    const lqcBinPath = path.join(__dirname, 'lqc.lqbin');
    const protobuf = require('protobufjs');
    
    try {
        console.log('Loading config.proto with protobufjs...');
        const root = await protobuf.load(configProtoPath);
        const packageName = 'lq.config';
        const ConfigTables = root.lookupType(`${packageName}.ConfigTables`);
        const lqcBuffer = await fs.readFile(lqcBinPath);
        const configTable = ConfigTables.decode(lqcBuffer);
        
        console.log('Load tables from lqc.lqbin...');

        console.log('Create parsed proto data...');
        const toClassName = (...parts) =>
            parts.join('_')
                .split('_')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
        let newProto = 'syntax = "proto3";\n\n';
        for (const schema of configTable.schemas) {
            for (const sheet of schema.sheets) {
                const className = toClassName(schema.name, sheet.name);
                const fields = sheet.fields
                    .map(field => {
                        const repeated = field.arrayLength > 0 ? 'repeated ' : '';
                        return `  ${repeated}${field.pbType} ${field.fieldName} = ${field.pbIndex};`;
                    })
                    .join('\n');
                newProto += `message ${className} {\n${fields}\n}\n\n`;
            }
        }
        
        console.log('Build derived protobuf schema...');
        const parsedRoot = protobuf.parse(newProto).root;
        
        console.log('Export data to json...');
        for (const data of configTable.datas) {
            if (!data.data?.length) {
                continue;
            }
            
            const className = toClassName(data.table, data.sheet);
            const klass = parsedRoot.lookupType(className);
            
            if (!klass) {
                console.warn(`Type not found: ${className}`);
                continue;
            }
            
            const jsonData = data.data.reduce((acc, fieldMsg) => {
                try {
                    const decoded = klass.decode(fieldMsg);
                    const row = klass.toObject(decoded, {
                        defaults: true,
                        arrays: true,
                        longs: String,
                        enums: Number,
                    });
                    acc.push(row);
                } catch (decodeError) {
                    console.warn(`Failed to decode data for ${className}:`, decodeError.message);
                }
                return acc;
            }, []);
            
            await fs.writeFile(path.join(dataDir, `${className}.json`), JSON.stringify(jsonData, null, 4));
            console.log(`Exported ${className}.json with ${jsonData.length} records`);
        }
        
        console.log('Export complete.');
    } catch (err) {
        console.error('Failed to parse lqc.lqbin or config.proto:', err);
    }

console.log('\nAll tasks complete.');
}

main();
