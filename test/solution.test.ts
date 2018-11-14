/*
 | Copyright 2018 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

import * as fetchMock from "fetch-mock";
import { CustomArrayLikeMatchers, CustomMatchers } from './customMatchers';

import * as solution from "../src/solution";
import { IFullItem } from "../src/fullItem";
import { ISwizzleHash } from "../src/dependencies";

import { ItemFailResponse, ItemDataOrResourceFailResponse,
  ItemSuccessResponseWMAWithoutUndesirableProps,
  ItemResourcesSuccessResponseNone, ItemResourcesSuccessResponseOne,
  ItemSuccessResponseDashboard, ItemDataSuccessResponseDashboard,
  ItemSuccessResponseWebmap, ItemDataSuccessResponseWebmap,
  ItemSuccessResponseWMA, ItemDataSuccessResponseWMA,
  ItemSuccessResponseService, ItemDataSuccessResponseService, ItemSuccessResponseServiceNoName,
  ItemSuccessResponseGroup
} from "./mocks/fullItemQueries";
import { FeatureServiceSuccessResponse,
  FeatureServiceSuccessResponseNoNames1, FeatureServiceSuccessResponseNoNames2,
  FeatureServiceSuccessResponseNoLayers,
  FeatureServiceLayer0SuccessResponse, FeatureServiceLayer1SuccessResponse
} from "./mocks/featureService";
import { SolutionWMA, SolutionEmptyGroup, SolutionDashboardNoMap, SolutionDashboardNoData } from "./mocks/solutions";

import { UserSession } from "@esri/arcgis-rest-auth";
import { IUserRequestOptions } from "@esri/arcgis-rest-auth";
import { TOMORROW, setMockDateTime, createRuntimeMockUserSession, roughClone } from "./lib/utils";
import { ISwizzle } from '../src';

//--------------------------------------------------------------------------------------------------------------------//

describe("Module `solution`: generation, publication, and cloning of a solution item", () => {

  const MOCK_ITEM_PROTOTYPE:IFullItem = {
    type: "",
    item: null
  };

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;  // default is 5000 ms

  // Set up a UserSession to use in all these tests
  const MOCK_USER_SESSION = new UserSession({
    clientId: "clientId",
    redirectUri: "https://example-app.com/redirect-uri",
    token: "fake-token",
    tokenExpires: TOMORROW,
    refreshToken: "refreshToken",
    refreshTokenExpires: TOMORROW,
    refreshTokenTTL: 1440,
    username: "casey",
    password: "123456",
    portal: "https://myorg.maps.arcgis.com/sharing/rest"
  });

  const MOCK_USER_REQOPTS:IUserRequestOptions = {
    authentication: MOCK_USER_SESSION
  };

  beforeEach(() => {
    jasmine.addMatchers(CustomMatchers);
  });

  afterEach(() => {
    fetchMock.restore();
    jasmine.clock().uninstall();
  });

  describe("create solution", () => {

    it("for single item containing WMA & feature service", done => {
      let baseSvcURL = "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/";
      fetchMock
      .mock("path:/sharing/rest/content/items/wma1234567890", ItemSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/data", ItemDataSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .mock("path:/sharing/rest/content/items/map1234567890", ItemSuccessResponseWebmap, {})
      .mock("path:/sharing/rest/content/items/map1234567890/data", ItemDataSuccessResponseWebmap, {})
      .mock("path:/sharing/rest/content/items/map1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .mock("path:/sharing/rest/content/items/svc1234567890", ItemSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/data", ItemDataSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .post(baseSvcURL + "FeatureServer?f=json", FeatureServiceSuccessResponse)
      .post(baseSvcURL + "FeatureServer/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(baseSvcURL + "FeatureServer/1?f=json", FeatureServiceLayer1SuccessResponse)
      solution.createSolution("wma1234567890", MOCK_USER_REQOPTS)
      .then(
        response => {
          expect(response).toEqual(SolutionWMA);
          done();
        },
        error => {
          done.fail(error);
        }
      );
    });

    it("for single item not containing WMA or feature service", done => {
      fetchMock
      .mock("path:/sharing/rest/content/items/grp1234567890", ItemFailResponse, {})
      .mock("path:/sharing/rest/community/groups/grp1234567890", ItemSuccessResponseGroup, {})
      .mock(
        "https://myorg.maps.arcgis.com/sharing/rest/content/groups/grp1234567890" +
        "?f=json&start=0&num=100&token=fake-token",
        '{"total":0,"start":1,"num":0,"nextStart":-1,"items":[]}', {});
      solution.createSolution("grp1234567890", MOCK_USER_REQOPTS)
      .then(
        response => {
          expect(response).toEqual(SolutionEmptyGroup);
          done();
        },
        error => {
          done.fail(error);
        }
      );
    });

    it("gets a service name from a layer if a service needs a name", done => {
      let fullItem:solution.IFullItemFeatureService = {
        type: "Feature Service",
        item: ItemSuccessResponseServiceNoName,
        data: ItemDataSuccessResponseService,
        service: null,
        layers: null,
        tables: null
      };
      fetchMock
      .post(fullItem.item.url + "?f=json", FeatureServiceSuccessResponse)
      .post(fullItem.item.url + "/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(fullItem.item.url + "/1?f=json", FeatureServiceLayer1SuccessResponse);
      solution.fleshOutFeatureService(fullItem, MOCK_USER_REQOPTS)
      .then(
        () => {
          expect(fullItem.service.name).toEqual(FeatureServiceSuccessResponse.layers[0].name);
          done();
        }
      );
    });

    it("gets a service name from a table if a service needs a name--no layer", done => {
      let fullItem:solution.IFullItemFeatureService = {
        type: "Feature Service",
        item: ItemSuccessResponseServiceNoName,
        data: ItemDataSuccessResponseService,
        service: null,
        layers: null,
        tables: null
      };
      fetchMock
      .post(fullItem.item.url + "?f=json", FeatureServiceSuccessResponseNoLayers)
      .post(fullItem.item.url + "/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(fullItem.item.url + "/1?f=json", FeatureServiceLayer1SuccessResponse);
      solution.fleshOutFeatureService(fullItem, MOCK_USER_REQOPTS)
      .then(
        () => {
          expect(fullItem.service.name).toEqual(FeatureServiceSuccessResponse.tables[0].name);
          done();
        }
      );
    });

    it("gets a service name from a table if a service needs a name--nameless layer", done => {
      let fullItem:solution.IFullItemFeatureService = {
        type: "Feature Service",
        item: ItemSuccessResponseServiceNoName,
        data: ItemDataSuccessResponseService,
        service: null,
        layers: null,
        tables: null
      };
      fetchMock
      .post(fullItem.item.url + "?f=json", FeatureServiceSuccessResponseNoNames1)
      .post(fullItem.item.url + "/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(fullItem.item.url + "/1?f=json", FeatureServiceLayer1SuccessResponse);
      solution.fleshOutFeatureService(fullItem, MOCK_USER_REQOPTS)
      .then(
        () => {
          expect(fullItem.service.name).toEqual(FeatureServiceSuccessResponse.tables[0].name);
          done();
        }
      );
    });

    it("falls back to 'Feature Service' if a service needs a name", done => {
      let fullItem:solution.IFullItemFeatureService = {
        type: "Feature Service",
        item: ItemSuccessResponseServiceNoName,
        data: ItemDataSuccessResponseService,
        service: null,
        layers: null,
        tables: null
      };
      fetchMock
      .post(fullItem.item.url + "?f=json", FeatureServiceSuccessResponseNoNames2)
      .post(fullItem.item.url + "/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(fullItem.item.url + "/1?f=json", FeatureServiceLayer1SuccessResponse);
      solution.fleshOutFeatureService(fullItem, MOCK_USER_REQOPTS)
      .then(
        () => {
          expect(fullItem.service.name).toEqual("Feature Service");
          done();
        }
      );
    });

  });

  describe("publish solution", () => {

    it("for single item containing WMA & feature service", done => {
      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"sln1234567890","folder":null}')
      .post("path:/sharing/rest/content/users/casey/items/sln1234567890/update",
        '{"success":true,"id":"sln1234567890"}')
      .post("path:/sharing/rest/content/users/casey/items/sln1234567890/share",
        '{"notSharedWith":[],"itemId":"sln1234567890"}');
      solution.publishSolution("My Solution", SolutionWMA, "public", MOCK_USER_REQOPTS)
      .then(
        response => {
          expect(response).toEqual({
            "success": true,
            "id": "sln1234567890"
          });
          done();
        },
        error => {
          done.fail(error);
        }
      );
    });

    it("for single item containing WMA & feature service, but item add fails", done => {
      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"error":{"code":400,"messageCode":"CONT_0113","message":"Item type not valid.","details":[]}}');
      solution.publishSolution("My Solution", SolutionWMA, "public", MOCK_USER_REQOPTS)
      .then(
        () => done.fail(),
        errorMsg => {
          expect(errorMsg).toEqual("Item type not valid.");
          done();
        }
      );
    });

    it("for single item containing WMA & feature service, but data add fails", done => {
      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"sln1234567890","folder":null}')
      .post("path:/sharing/rest/content/users/casey/items/sln1234567890/update",
      '{"error":{"code":400,"messageCode":"CONT_0001","message":"Item does not exist or is inaccessible.","details":[]}}');
      solution.publishSolution("My Solution", SolutionWMA, "public", MOCK_USER_REQOPTS)
      .then(
        () => done.fail(),
        errorMsg => {
          expect(errorMsg).toEqual("Item does not exist or is inaccessible.");
          done();
        }
      );
    });

    it("for single item containing WMA & feature service, but share fails", done => {
      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"sln1234567890","folder":null}')
      .post("path:/sharing/rest/content/users/casey/items/sln1234567890/update",
        '{"success":true,"id":"sln1234567890"}')
      .post("path:/sharing/rest/content/users/casey/items/sln1234567890/share",
        '{"error":{"code":400,"messageCode":"CONT_0001","message":"Item does not exist or is inaccessible.","details":[]}}');
      solution.publishSolution("My Solution", SolutionWMA, "public", MOCK_USER_REQOPTS)
      .then(
        () => done.fail(),
        errorMsg => {
          expect(errorMsg).toEqual("Item does not exist or is inaccessible.");
          done();
        }
      );
    });

  });

  xdescribe("clone solution", () => {

    it("should create a Dashboard", done => {
      let fullItem:IFullItem = roughClone(SolutionDashboardNoMap.dash1234567890);
      let folderId:string = null;
      let swizzles:ISwizzleHash = {};
      let orgSession:solution.IOrgSession = {
        orgUrl: "https://myOrg.maps.arcgis.com",
        portalUrl: "https://www.arcgis.com",
        ...MOCK_USER_REQOPTS
      };

      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"sln1234567890","folder":null}');
      solution.createItem(fullItem, folderId, swizzles, orgSession)
      .then(
        createdItemId => {
          expect(createdItemId).toEqual("sln1234567890");
          done();
        },
        () => done.fail()
      );
    });

  });

  describe("supporting routine: create item", () => {

    it("should create a mapless Dashboard", done => {
      let fullItem:IFullItem = roughClone(SolutionDashboardNoMap.dash1234567890);
      let folderId:string = null;
      let swizzles:ISwizzleHash = {};
      let orgSession:solution.IOrgSession = {
        orgUrl: "https://myOrg.maps.arcgis.com",
        portalUrl: "https://www.arcgis.com",
        ...MOCK_USER_REQOPTS
      };

      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"sln1234567890","folder":null}');
      solution.createItem(fullItem, folderId, swizzles, orgSession)
      .then(
        createdItemId => {
          expect(createdItemId).toEqual("sln1234567890");
          done();
        },
        () => done.fail()
      );
    });

    it("should create a dataless Dashboard", done => {
      let fullItem:IFullItem = roughClone(SolutionDashboardNoMap.dash1234567890);
      let folderId:string = null;
      let swizzles:ISwizzleHash = {};
      let orgSession:solution.IOrgSession = {
        orgUrl: "https://myOrg.maps.arcgis.com",
        portalUrl: "https://www.arcgis.com",
        ...MOCK_USER_REQOPTS
      };

      fetchMock
      .post("path:/sharing/rest/content/users/casey/addItem",
        '{"success":true,"id":"dash1234567890","folder":null}');
      solution.createItem(fullItem, folderId, swizzles, orgSession)
      .then(
        createdItemId => {
          expect(createdItemId).toEqual("dash1234567890");
          done();
        },
        () => done.fail()
      );
    });

    it("should create a Feature Service", done => {
      // Because we make the service name unique by appending a timestamp, set up a clock & user session
      // with known results
      let fullItem:IFullItem = roughClone(SolutionWMA.svc1234567890);
      let folderId:string = "fld1234567890";
      let swizzles:ISwizzleHash = {};

      let now = 1555555555555;
      let orgSession:solution.IOrgSession = {
        orgUrl: "https://myOrg.maps.arcgis.com",
        portalUrl: "https://www.arcgis.com",
        authentication: createRuntimeMockUserSession(setMockDateTime(now))
      };

      // Feature layer indices are assigned incrementally as they are added to the feature service
      let layerNumUpdater = (function () {
          var layerNum = 0;
          return () => layerNum++;
      })();

      fetchMock
      .post("path:/sharing/rest/content/users/casey/createService",
        '{"encodedServiceURL":"https://services123.arcgis.com/org1234567890/arcgis/rest/services/' +
        'ROWPermits_publiccomment_' + now + '/FeatureServer","itemId":"svc1234567890",' +
        '"name":"ROWPermits_publiccomment_' + now + '","serviceItemId":"svc1234567890",' +
        '"serviceurl":"https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment_' +
        now + '/FeatureServer","size":-1,"success":true,"type":"Feature Service","isView":false}')
      .post("path:/sharing/rest/content/users/casey/items/svc1234567890/move",
        '{"success":true,"itemId":"svc1234567890","owner":"casey","folder":"fld1234567890"}')
      .post("path:/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment_" + now +
        "/FeatureServer/addToDefinition", layerNumUpdater)
      .post("path:/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment_" + now +
        "/FeatureServer/0/addToDefinition", '{"success":true}')
      .post("path:/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment_" + now +
        "/FeatureServer/1/addToDefinition", '{"success":true}');
      solution.createItem(fullItem, folderId, swizzles, orgSession)
      .then(
        createdItemId => {
          // Check that we're appending a timestamp to the service name
          let createServiceCall = fetchMock.calls("path:/sharing/rest/content/users/casey/createService");
          let createServiceCallBody = createServiceCall[0][1].body as string;
          expect(createServiceCallBody.indexOf("name%22%3A%22ROWPermits_publiccomment_1555555555555%22%2C"))
            .toBeGreaterThan(0);

          expect(createdItemId).toEqual("svc1234567890");
          done();
        },
        () => done.fail()
      );
    });

    it("should handle an error while trying to create a Feature Service", done => {
      let fullItem:IFullItem = roughClone(SolutionWMA.svc1234567890);
      fullItem.item.url = null;
      expect(SolutionWMA.svc1234567890.item.url).toEqual("https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer");

      let folderId:string = "fld1234567890";
      let swizzles:ISwizzleHash = {};

      // Because we make the service name unique by appending a timestamp, set up a clock & user session
      // with known results
      let now = 1555555555555;
      let orgSession:solution.IOrgSession = {
        orgUrl: "https://myOrg.maps.arcgis.com",
        portalUrl: "https://www.arcgis.com",
        authentication: createRuntimeMockUserSession(setMockDateTime(now))
      };

      fetchMock
      .post("path:/sharing/rest/content/users/casey/createService",
        '{"success":false}');
      solution.createItem(fullItem, folderId, swizzles, orgSession)
      .then(
        () => done.fail(),
        errorMsg => {
          expect(errorMsg).toEqual('Unable to create Feature Service: {"success":false}');
          done();
        }
      );
    });

    /*
    xit("should create an empty Group", done => {});

    xit("should create a Group and add its members", done => {});

    xit("should handle a member-add failure whie tryign to create a Group", done => {});

    xit("should create a Web Mapping Application", done => {});

    xit("should handle an item creation failure while trying to create a Web Mapping Application", done => {});

    xit("should handle a URL update failure while trying to create a Web Mapping Application", done => {});
    */

  });

  describe("supporting routine: get cloning order", () => {

    it("sorts an item and its dependencies 1", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi", "def"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
    });

    it("sorts an item and its dependencies 2", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi", "def"];
      def.dependencies = ["ghi"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "def"});
    });

    it("sorts an item and its dependencies 3", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi"];
      ghi.dependencies = ["def"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "ghi"});
    });

    it("reports a multi-item cyclic dependency graph", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi"];
      def.dependencies = ["ghi"];
      ghi.dependencies = ["abc"];

      expect(function () {
        let results:string[] = solution.topologicallySortItems({
          "abc": abc,
          "def": def,
          "ghi": ghi,
        });
      }).toThrowError(Error, "Cyclical dependency graph detected");
    });

    it("reports a single-item cyclic dependency graph", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      def.dependencies = ["def"];

      expect(function () {
        let results:string[] = solution.topologicallySortItems({
          "abc": abc,
          "def": def,
          "ghi": ghi,
        });
      }).toThrowError(Error, "Cyclical dependency graph detected");
    });

  });

  describe("supporting routine: remove undesirable properties", () => {

    it("remove properties", () => {
      let abc = {...ItemSuccessResponseWMA};

      let abcCopy = solution.removeUndesirableItemProperties(abc);
      expect(abc).toEqual(ItemSuccessResponseWMA);
      expect(abcCopy).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);
    });

    it("shallow copy if properties already removed", () => {
      let abc = {...ItemSuccessResponseWMAWithoutUndesirableProps};

      let abcCopy = solution.removeUndesirableItemProperties(abc);
      expect(abc).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);
      expect(abcCopy).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);

      abcCopy.id = "WMA123";
      expect(abc.id).toEqual("wma1234567890");
    });

    it("checks for item before attempting to access its properties", () => {
      let result = solution.removeUndesirableItemProperties(null);
      expect(result).toBeNull();
    });

  });

  describe("supporting routine: timestamp", () => {

    it("should return time 1541440408000", () => {
      let expected = 1541440408000;
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(expected));
      expect(solution.getTimestamp()).toEqual(expected.toString());
      jasmine.clock().uninstall();
    });

  });

  describe("supporting routine: update WMA URL", () => {

    let orgSession:solution.IOrgSession = {
      orgUrl: "https://myOrg.maps.arcgis.com",
      portalUrl: "https://www.arcgis.com",
      ...MOCK_USER_REQOPTS
    };

    let abc = {...MOCK_ITEM_PROTOTYPE};
    abc.item = {...ItemSuccessResponseWMA};
    abc.item.url = solution.aPlaceholderServerName + "/apps/CrowdsourcePolling/index.html?appid=";

    it("success", done => {
      fetchMock
      .post("https://myorg.maps.arcgis.com/sharing/rest/content/users/casey/items/wma1234567890/update",
      '{"success":true,"id":"wma1234567890"}');
      solution.updateWebMappingApplicationURL(abc, orgSession)
      .then(response => {
        expect(response).toEqual("wma1234567890");
        done();
      });
    });

    it("failure", done => {
      fetchMock
      .post("https://myorg.maps.arcgis.com/sharing/rest/content/users/casey/items/wma1234567890/update",
      "Unable to update web mapping app: wma1234567890");
      solution.updateWebMappingApplicationURL(abc, orgSession)
      .then(
        fail,
        error => {
          expect(error).toEqual("Unable to update web mapping app: wma1234567890");
          done();
        }
      );
    });

  });

});
