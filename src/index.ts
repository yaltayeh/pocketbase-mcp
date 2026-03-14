import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import PocketBase from 'pocketbase';
import { collectionModelSchema } from './schemas.js';

const server = new McpServer({ name: 'pocketbase-mcp', version: '0.0.1' });

let pocketbase:PocketBase|null = null; // This will hold the PocketBase client instance once connected

server.registerTool("connect",
    {
        title: "Connect to PocketBase",
        description: "Connect to a PocketBase instance",
        inputSchema: z.object({
            url: z.url(),
            email: z.string().optional(),
            password: z.string().optional()
        }),
        outputSchema: z.object({
            status: z.string()
        })
    },
    async ({ url, email, password }) => {
        pocketbase = new PocketBase(url);
        pocketbase.autoCancellation(false); // Disable auto-cancellation for long-running operations
        if (email && password) {
            await pocketbase.collection("_superusers").authWithPassword(email, password);
        }

        if (pocketbase.authStore.isValid) {
            console.log('Successfully authenticated with PocketBase');
            return {
                content: [{ type: "text", text: `Successfully connected and authenticated to PocketBase at ${url}`}],
                structuredContent: { status: "success" }
            };
        } else {
            console.warn('Failed to authenticate with PocketBase. Please check your credentials.');
            return {
                content: [{ type: "text", text: `Connected to PocketBase at ${url}, but authentication failed. Please check your credentials.`}],
                structuredContent: { status: "connected_but_unauthenticated" }
            };
        }
    }
);

server.registerTool("list_collections",
    {
        title: "List Collections",
        description: "List all collections in the connected PocketBase instance",
        inputSchema: z.object({}),
        outputSchema: z.object({
            collections: z.array(z.record(z.string(), z.any()))
        })
    },
    async () => {
        if (!pocketbase) {
            throw new Error("Not connected to PocketBase. Please connect first.");
        }
        const collections = await pocketbase.collections.getFullList();
        console.log("collectios ", collections)
        return {
            content: [
                { type: "text", text: `Found ${collections.length} collections.`},
                { type: "text", text: JSON.stringify(collections) }
            ],
            structuredContent: { collections: collections }
        };
    }
);

server.registerTool("create_collection", {
    title: "Create Collection",
    description: "Create a new collection in the connected PocketBase instance",
    inputSchema: z.object({config: collectionModelSchema}),
    outputSchema: z.object({config: collectionModelSchema})
}, async ({config}) => {
    if (!pocketbase) {
        throw new Error("Not connected to PocketBase. Please connect first.");
    }
    const collection = await pocketbase.collections.create(config);
    return {
        content: [{ type: "text", text: `Collection '${config.name}' created with ID ${collection.id}.`}],
        structuredContent: { collection: { id: collection.id, name: collection.name } }
    };
});

server.registerTool("remove_collection", {
    title: "Remove Collection",
    description: "Remove a collection from the connected PocketBase instance",
    inputSchema: z.object({
        id: z.string()
    }),
    outputSchema: z.object({
        status: z.string()
    })
}, async ({ id }) => {
    if (!pocketbase) {
        throw new Error("Not connected to PocketBase. Please connect first.");
    }
    const isRemoved = await pocketbase.collections.delete(id);
    if (!isRemoved) {
        throw new Error(`Failed to remove collection with ID ${id}. Please check if the ID is correct.`);
    }
    return {
        content: [{ type: "text", text: `Collection with ID ${id} has been removed.`}],
        structuredContent: { status: "collection_removed" }
    };
});

const transport = new StdioServerTransport();
await server.connect(transport);