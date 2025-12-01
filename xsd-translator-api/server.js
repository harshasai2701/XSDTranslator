import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function extractRootNameFromXsd(xsd) {
    const match = xsd.match(/<xs:element name="([^"]+)"/);
    return match ? match[1] : "TransformedOutput";
}


function flattenObject(obj, prefix = "", out = {}) {
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === "object") {
            flattenObject(value, newKey, out);
        } else {
            out[newKey] = value;
        }
    }
    return out;
}

function buildNestedXmlObject(mapping, flatInput, rootNameFromXsd) {
    const result = {};

    for (const [jsonPath, xmlPath] of Object.entries(mapping)) {
        const value = flatInput[jsonPath] ?? "";

        if (!xmlPath || typeof xmlPath !== "string") continue;

        const segments = xmlPath.split(".").filter(Boolean);
        if (segments.length === 0) continue;

        const xmlRoot = segments[0];
        const rootKey = rootNameFromXsd || xmlRoot;
        const innerSegments = segments.slice(1);

        if (!result[rootKey]) result[rootKey] = {};
        let current = result[rootKey];

        for (let i = 0; i < innerSegments.length; i++) {
            const isLeaf = i === innerSegments.length - 1;
            const seg = innerSegments[i];

            if (isLeaf) {
                current[seg] = value;
            } else {
                if (!current[seg] || typeof current[seg] !== "object") {
                    current[seg] = {};
                }
                current = current[seg];
            }
        }
    }

    return result;
}

app.post("/generate-mapping", async (req, res) => {
    try {
        const { jsonSchema, xmlXsd } = req.body;

        if (!jsonSchema || !xmlXsd) {
            return res
                .status(400)
                .json({ error: "jsonSchema and xmlXsd are required" });
        }

        const prompt = `
            You will generate a FLAT mapping between a JSON Schema (source) and an XML XSD (target).
            IMPORTANT:
            - JSON side: use dotted JSON paths without root, like: "customerId", "address.line1"
            - XML side: use FULL XML paths including the XML root element, using dot notation, like: "CustomerRequest.CustID" , "CustomerRequest.BasicInfo.Name"
            - Output ONLY JSON of the form:
            {
                "json.path": "XmlRoot.XmlChild.XmlGrandChild",
                ...
            }

            JSON Schema (source):
            ${typeof jsonSchema === "string" ? jsonSchema : JSON.stringify(jsonSchema, null, 2)}
            XML XSD (target): ${xmlXsd}
            Return ONLY the mapping JSON, nothing else.
        `;

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
        });

        const mappingText = completion.choices[0].message.content.trim();

        res.json({ mapping: mappingText });
    } catch (err) {
        console.error("Mapping Error:", err);
        res.status(500).json({ error: "Failed to generate mapping" });
    }
});

app.post("/transform-xml", (req, res) => {
    try {
        const { inputXml, mappingJson, xmlXsd } = req.body;

        if (!inputXml || !mappingJson || !xmlXsd) {
            return res
                .status(400)
                .json({ error: "inputXml, mappingJson, xmlXsd are required" });
        }

        const mapping = JSON.parse(mappingJson);
        const targetRootName = extractRootNameFromXsd(xmlXsd);
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(inputXml);

        const inputRoot = Object.keys(parsed)[0];
        const stripped = parsed[inputRoot];

        const flatInput = flattenObject(stripped);

        const nestedXmlObj = buildNestedXmlObject(mapping, flatInput, targetRootName);

        const builder = new XMLBuilder({ format: true });
        const finalXml = builder.build(nestedXmlObj);

        res.set("Content-Type", "application/xml");
        res.send(finalXml);
    } catch (err) {
        console.error("Transform Error:", err);
        res
            .status(500)
            .json({ error: "Failed to transform XML", details: err.message });
    }
});

app.listen(5000, () =>
    console.log("Backend running at port 5000")
);