import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "earthquake-tracker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_recent_earthquakes",
        description: "Fetch recent earthquake data from USGS",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of earthquakes to return (default 5)",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_recent_earthquakes") {
    const limit = request.params.arguments?.limit || 5;
    
    try {
      const response = await fetch(
        `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
      );
      const data = await response.json();
      
      const earthquakes = data.features.slice(0, limit).map((quake) => ({
        place: quake.properties.place,
        magnitude: quake.properties.mag,
        time: new Date(quake.properties.time).toISOString(),
        url: quake.properties.url,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(earthquakes, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching earthquake data: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Earthquake MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
