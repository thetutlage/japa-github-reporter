import { test } from "@japa/runner";
test.group("Maths.add", () => {
  test("add two numbers", ({ expect }) => {
    expect(1 + 1).toBe(3);
  });
});
