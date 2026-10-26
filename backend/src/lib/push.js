const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const Connection = require("../models/Connection");

let client, clientEndpoint;

function getClient(event) {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  if (!client || clientEndpoint !== endpoint) {
    client = new ApiGatewayManagementApiClient({ endpoint });
    clientEndpoint = endpoint;
  }
  return client;
}

// Sends one JSON payload to many connections; one failure never blocks the others
async function pushToConnections(event, connectionIds, payload) {
  const api = getClient(event);
  const data = Buffer.from(JSON.stringify(payload));

  await Promise.allSettled(
    connectionIds.map(async (connectionId) => {
      try {
        await api.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
      } catch (err) {
        if (err.name === "GoneException" || err.$metadata?.httpStatusCode === 410) {
          await Connection.deleteOne({ connectionId });   // client left: prune the stale record
        } else {
          console.error("Push failed:", err.name);
        }
      }
    })
  );
}

module.exports = { pushToConnections };