import * as pack from "../package.json";
import Helpers from "../src/helpers";

describe("[helpers]", () => {
  test("getVersion returns correct value from package.json", () => {
    expect(Helpers.getVersion()).toEqual(pack.version);
  });

  test("getName returns correct value from package.json", () => {
    expect(Helpers.getName()).toEqual(pack.name);
  });

  test("getDescription returns correct value from package.json", () => {
    expect(Helpers.getDescription()).toEqual(pack.description);
  });
});
