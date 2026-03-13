
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

describe('tools', () => {
	// Setup client and transport
	const transport = new StdioClientTransport({
		command: 'node',
		args: ['./build/index.js'],
		env: { NODE_ENV: 'production' },
		cwd: './'
	});
	// Use a unique client name to avoid conflicts with other tests
	const client = new Client({ name: 'tools-jest-tester', version: '1.0.0' });

	// Connect before all tests
	beforeAll(async () => {
		await client.connect(transport);
	})

	// Close after all tests
	afterAll(async () => {
		await client.close();
	})

	test("list tools", async () => {
		const tools = await client.listTools();
		expect(tools).toBeDefined();
		expect(Array.isArray(tools.tools)).toBe(true);
		expect(tools.tools.length).toBeGreaterThan(0);
	});

	test("connect tool", async () => {
		const response = await client.callTool({
			"name": "connect",
			"arguments": {
				"url": "http://localhost:8090",
				"email": "admin@example.com",
				"password": "admin123"
			},
		})
		
		expect(response).toBeDefined();
		const { status } = response.structuredContent;
		expect(status).toBe("success");
	});

	test("list collections",  async () => {
		const response = await client.callTool({
			"name": "list_collections",
			"arguments": {},
		})
		
		expect(response).toBeDefined();
		const { collections } = response.structuredContent;
		expect(Array.isArray(collections)).toBe(true);
		expect(collections.length).toBeGreaterThan(0);
		expect(collections.find(c => c.name === "_superusers")).toBeDefined();
	});

	test("create collection", async () => {
		const response = await client.callTool({
			"name": "create_collection",
			"arguments": {
				"name": "test_collection"
			},
		})
		
		expect(response).toBeDefined();
		const { collection } = response.structuredContent;
		expect(collection).toBeDefined();
		expect(collection.name).toBe("test_collection");
	});
});
