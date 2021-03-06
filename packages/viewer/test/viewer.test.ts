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

/**
 * Provides tests for functions involving access to the solution's contents.
 */

import * as common from "@esri/solution-common";
import * as fetchMock from "fetch-mock";
import * as mockItems from "../../common/test/mocks/agolItems";
import * as utils from "../../common/test/mocks/utils";
import * as viewer from "../src/viewer";

let MOCK_USER_SESSION: common.UserSession;

let sampleItemTemplate: any;
beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();

  sampleItemTemplate = {
    item: {
      name: null,
      title: "z2g9f4nv",
      type: "Solution",
      typeKeywords: ["Solution", "Deployed"],
      description: null,
      tags: [],
      snippet: null,
      thumbnail: null,
      documentation: null,
      extent: "{{solutionItemExtent}}",
      categories: [],
      spatialReference: null,
      accessInformation: null,
      licenseInfo: null,
      culture: "english (united states)",
      properties: null,
      url: null,
      proxyFilter: null,
      access: "private",
      appCategories: [],
      industries: [],
      languages: [],
      largeThumbnail: null,
      banner: null,
      screenshots: [],
      listed: false,
      groupDesignations: null,
      id: "itm1234567890"
    },
    data: {
      metadata: {},
      templates: [
        {
          itemId: "geo1234567890",
          type: "GeoJson",
          dependencies: []
        }
      ]
    }
  };
});

afterEach(() => {
  fetchMock.restore();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `viewer`", () => {
  describe("compareItems", () => {
    it("handles identity with supplied Solution items", done => {
      viewer
        .compareItems(sampleItemTemplate.item, sampleItemTemplate.item)
        .then(
          match => {
            match ? done() : done.fail();
          },
          () => done.fail()
        );
    });

    it("handles non-Solution items", done => {
      const item1 = {
        ...sampleItemTemplate.item,
        type: "Web Map"
      };
      const item2 = {
        ...item1,
        id: "map1234567890"
      };
      viewer.compareItems(item1, item2).then(
        match => {
          match ? done() : done.fail();
        },
        () => done.fail()
      );
    });

    it("handles different items", done => {
      const item1 = {
        ...sampleItemTemplate.item,
        type: "Web Map"
      };
      const item2 = {
        ...item1,
        type: "Web Mapping Application"
      };
      viewer.compareItems(item1, item2).then(
        match => {
          match ? done.fail() : done();
        },
        () => done.fail()
      );
    });

    it("handles identity with supplied item ids", done => {
      fetchMock.get(
        utils.PORTAL_SUBSET.restUrl +
          "/content/items/itm1234567890?f=json&token=fake-token",
        sampleItemTemplate.item
      );
      viewer
        .compareItems(
          sampleItemTemplate.item.id,
          sampleItemTemplate.item.id,
          MOCK_USER_SESSION
        )
        .then(
          match => {
            match ? done() : done.fail();
          },
          () => done.fail()
        );
    });

    it("handles identity with supplied item ids, but failed GET", done => {
      fetchMock.get(
        utils.PORTAL_SUBSET.restUrl +
          "/content/items/itm1234567890?f=json&token=fake-token",
        mockItems.get500Failure()
      );
      viewer
        .compareItems(
          sampleItemTemplate.item.id,
          sampleItemTemplate.item.id,
          MOCK_USER_SESSION
        )
        .then(
          () => done.fail(),
          () => done()
        );
    });
  });
});
