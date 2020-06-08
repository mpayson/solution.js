/** @license
 * Copyright 2018 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  _getNewItemId,
  _checkedReplaceAll,
  _updateGroupReferences
} from "../src/deploySolutionFromTemplate";

describe("Module `deploySolutionFromTemplate`", () => {
  describe("_getNewItemId", () => {
    it("handles id not found in template dictionary", () => {
      const sourceId = "itm1234567890";
      const templateDictionary = {};
      const actualResult = _getNewItemId(sourceId, templateDictionary);
      expect(actualResult).toEqual(sourceId);
    });
    it("handles id found in template dictionary", () => {
      const sourceId = "itm1234567890";
      const templateDictionary = {
        itm1234567890: { itemId: "bc4" }
      };
      const actualResult = _getNewItemId(sourceId, templateDictionary);
      expect(actualResult).toEqual("bc4");
    });
  });

  describe("_checkedReplaceAll", () => {
    it("_checkedReplaceAll no template", () => {
      const template: string = null;
      const oldValue = "onm";
      const newValue = "ONM";
      const expectedResult = template;

      const actualResult = _checkedReplaceAll(template, oldValue, newValue);
      expect(actualResult).toEqual(expectedResult);
    });

    it("_checkedReplaceAll no matches", () => {
      const template = "abcdefghijklmnopqrstuvwxyz";
      const oldValue = "onm";
      const newValue = "ONM";
      const expectedResult = template;

      const actualResult = _checkedReplaceAll(template, oldValue, newValue);
      expect(actualResult).toEqual(expectedResult);
    });

    it("_checkedReplaceAll one match", () => {
      const template = "abcdefghijklmnopqrstuvwxyz";
      const oldValue = "mno";
      const newValue = "MNO";
      const expectedResult = "abcdefghijklMNOpqrstuvwxyz";

      const actualResult = _checkedReplaceAll(template, oldValue, newValue);
      expect(actualResult).toEqual(expectedResult);
    });

    it("_checkedReplaceAll two matches", () => {
      const template = "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz";
      const oldValue = "mno";
      const newValue = "MNO";
      const expectedResult =
        "abcdefghijklMNOpqrstuvwxyzabcdefghijklMNOpqrstuvwxyz";

      const actualResult = _checkedReplaceAll(template, oldValue, newValue);
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe("_updateGroupReferences", () => {
    it("replaces group references", () => {
      const itemTemplates = [
        {
          type: "Group",
          itemId: "xyz",
          groups: ["abc", "ghi"]
        },
        {
          type: "Group",
          itemId: "def",
          groups: ["abc", "ghi"]
        }
      ];
      const templateDictionary = {
        abc: {
          itemId: "xyz"
        }
      };

      const actual = _updateGroupReferences(itemTemplates, templateDictionary);
      expect(actual).toEqual([
        {
          type: "Group",
          itemId: "xyz",
          groups: ["xyz", "ghi"]
        },
        {
          type: "Group",
          itemId: "def",
          groups: ["xyz", "ghi"]
        }
      ]);
    });
  });
});