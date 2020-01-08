const express = require('express');
const bodyParser = require('body-parser');
const gremlin = require('gremlin');
const cors = require('cors');
const request = require('request');
const querystring = require("querystring");
const app = express();
const port = 3001;
const REST_SERVER = true;
const pino = require('pino');
const expressPino = require('express-pino-logger');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const expressLogger = expressPino({ logger });

app.use(expressLogger);

app.use(cors({
    credentials: true,
}));

// parse application/json
app.use(bodyParser.json());

function mapToObj(inputMap) {
    let obj = {};

    inputMap.forEach((value, key) => {
        obj[key] = value
    });

    return obj;
}

function edgesToJson(edgeList) {
    return edgeList.map(
        edge => ({
            id: typeof edge.get('id') !== "string" ? JSON.stringify(edge.get('id')) : edge.get('id'),
            from: edge.get('from'),
            to: edge.get('to'),
            label: edge.get('label'),
            properties: mapToObj(edge.get('properties')),
        })
    );
}

function nodesToJson(nodeList) {
    return nodeList.map(
        node => ({
            id: node.get('id'),
            label: node.get('label'),
            properties: mapToObj(node.get('properties')),
            edges: edgesToJson(node.get('edges'))
        })
    );
}

function makeQuery(query, nodeLimit) {
    const nodeLimitQuery = !isNaN(nodeLimit) && Number(nodeLimit) > 0 ? `.limit(${nodeLimit})` : '';
    if (query === "" || !query) {
        query = "g.V()"
    }
    const getNodesQuery = "" +
        "" + ".dedup().as('node')" +                                       // deduplication and save var as node
        "" + ".project('id','label','properties','edges')" +               // define columns from node as table
        "" +     ".by(__.id())" +                                          // node.id
        "" +     ".by(__.label())" +                                       // node.label
        "" +     ".by(__.valueMap())" +                                    // node.properties
        "" +     ".by(__.outE()" +                                         // node.edges
        "" +       ".project('id','from','to','label','properties')" +     // node.edges columns as table
        "" +           ".by(__.id())" +                                    // node.edges[].id
        "" +           ".by(__.select('node').id())" +                     // node.edges[].from
        "" +           ".by(__.inV().id())" +                              // node.edges[].to
        "" +           ".by(__.label())" +                                 // node.edges[].label
        "" +           ".by(__.valueMap())" +                              // node.edges[].properties
        "" +        ".fold())";                                            // node.edges[]
    return `${query}${nodeLimitQuery}${getNodesQuery}`
}

app.post('/query', (req, res, next) => {
    const gremlinHost = req.body.host;
    const gremlinPort = req.body.port;
    const nodeLimit = req.body.nodeLimit;
    const query = req.body.query;

    logger.debug("original query %s", query);
    const realQuery = makeQuery(query, nodeLimit);
    logger.debug("real query %s", realQuery);

    if (!REST_SERVER) {
        const client = new gremlin.driver.Client(`ws://${gremlinHost}:${gremlinPort}/gremlin`, {
            traversalSource: 'g',
            mimeType: 'application/json'
        });

        client.submit(makeQuery(realQuery, nodeLimit), {})
            .then((result) => res.send(nodesToJson(result._items)))
            .catch((err) => next(err));
    } else {
        const safeQuery = querystring.escape(realQuery);
        const url = `http://${gremlinHost}:${gremlinPort}?gremlin=${safeQuery}`;

        request(url, {json: true}, (restError, restResponse, restBody) => {
            console.debug(restResponse);
            if (restError) {
                console.warn(restResponse);
                next(restError);
                return;
            }
            if (restResponse.statusCode !== 200) {
                console.warn(restResponse.body.message);
                console.log(restResponse.body);
                const errorJson = {message: restResponse.body.message};
                res.status(500).send(errorJson);
                return;
            }
            res.send(restBody.result.data);
        });
    }
});

app.listen(port, () => console.log(`Simple gremlin-proxy server listening on port ${port}!`));
