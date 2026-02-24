import { describe, expect, test } from "bun:test";

describe("index.js public exports", () => {
	test("exports the expected public API", async () => {
		const mod = await import("../src/index.js");

		expect(typeof mod.initCommands).toBe("function");
		expect(typeof mod.initComponents).toBe("function");
		expect(typeof mod.lazy).toBe("function");
		expect(typeof mod.observeOpenShadowRoots).toBe("function");
		expect(typeof mod.observer).toBe("function");
		expect(typeof mod.parseConfig).toBe("function");
	});
});
