import { useState } from "react";
import axios from "axios";
import "./Translator.css";

export default function Translator() {
    const [jsonSchema, setJsonSchema] = useState("");
    const [xmlXsd, setXmlXsd] = useState("");
    const [mapping, setMapping] = useState("");
    const [inputXml, setInputXml] = useState("");
    const [outputXml, setOutputXml] = useState("");
    const [loading, setLoading] = useState(false);

    const generateMapping = async () => {
        if (!jsonSchema || !xmlXsd) {
            alert("Please enter both JSON Schema and XML XSD.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("https://organic-giggle-vpv65ggv6v5fx7jq-5000.app.github.dev/generate-mapping", {
                jsonSchema,
                xmlXsd
            });

            setMapping(response.data.mapping);
        } catch (err) {
            console.error(err);
            alert("Invalid JSON Schema or XML XSD");
        }
        setLoading(false);
    };

    const transformXml = async () => {
        if (!inputXml || !mapping || !xmlXsd) {
            alert("Please provide Input XML, Mapping JSON, and XML XSD.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("https://organic-giggle-vpv65ggv6v5fx7jq-5000.app.github.dev/transform-xml", {
                inputXml,
                mappingJson: mapping,
                xmlXsd
            });

            setOutputXml(response.data);
        } catch (err) {
            alert("Invalid XML structure");
        }
        setLoading(false);
    };

    return (
        <div>
            <h2 className="heading">Mapping Template Generation</h2>
            <div className="translator-container">
                <div className="row-two-cols">
                    <div className="box">
                        <h3>JSON Schema</h3>
                        <textarea
                            value={jsonSchema}
                            onChange={(e) => setJsonSchema(e.target.value)}
                            placeholder="Paste JSON Schema..."
                        />
                    </div>

                    <div className="box">
                        <h3>XML XSD</h3>
                        <textarea
                            value={xmlXsd}
                            onChange={(e) => setXmlXsd(e.target.value)}
                            placeholder="Paste XML XSD..."
                        />
                    </div>
                </div>

                <div className="button-row">
                    <button disabled={loading} onClick={generateMapping}>
                        {loading ? "Generating..." : "Generate Mapping Template"}
                    </button>
                </div>

                <div className="row-two-cols">
                    <div className="box">
                        <h3>Mapping Template</h3>
                        <textarea
                            value={mapping}
                            onChange={(e) => setMapping(e.target.value)}
                            placeholder="Mapping Template will appear here..."
                        />
                    </div>

                    <div className="box">
                        <h3>Quote Details</h3>
                        <textarea
                            value={inputXml}
                            onChange={(e) => setInputXml(e.target.value)}
                            placeholder="Paste your Quote Details here..."
                        />
                    </div>
                </div>

                <div className="button-row">
                    <button disabled={loading} onClick={transformXml}>
                        {loading ? "Generating..." : "Generate Quote Request"}
                    </button>
                </div>

                <div className="output-box">
                    <h3>Quote Request</h3>
                    <textarea value={outputXml} readOnly placeholder="Quote Request will appear here..." />
                </div>
            </div>
        </div>
    );
}