/** @license
 * Copyright 2020 Esri
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

// TODO ENSURE THIS CREATES IN THE TARGET FOLDER
import {
  IModel,
  failSafe,
  serializeModel,
  interpolateItemId,
  stringToBlob
} from "@esri/hub-common";

import { UserSession } from "@esri/arcgis-rest-auth";
import { IItemTemplate } from "@esri/solution-common";

import {
  createItem,
  moveItem,
  addItemResource,
  updateItem,
  ICreateItemResponse
} from "@esri/arcgis-rest-portal";

/**
 * Create a StoryMap from an interpolated template
 * @param model
 * @param options
 * @param authentication
 */
export function createStoryMap(
  model: IModel,
  folderId: string,
  options: any,
  authentication: UserSession
): Promise<IModel> {
  // create an array to hold well-known resources
  // that we have to generate from the passed in model
  const resources: any[] = [];

  // Create the item
  // For unkown reasons we can not seem to spy on createItemInFolder
  // so we will create-then-move for now
  return createItem({
    item: serializeModel(model),
    authentication
  })
    .then((createResponse: ICreateItemResponse) => {
      // hold the id in the model
      model.item.id = createResponse.id;
      // and re-interpolate the item id
      model = interpolateItemId(model);
      // Compute the item url based on current environment

      // Storymaps store draft data in a timestamped resource attached to the item
      // We'll just use the published data for the first "draft"
      resources.push({
        name: model.properties.draftFileName,
        file: stringToBlob(JSON.stringify(model.data))
      });
      resources.push({
        name: "oembed.json",
        file: stringToBlob(JSON.stringify(model.properties.oembed))
      });
      resources.push({
        name: "oembed.xml",
        file: stringToBlob(model.properties.oembedXML)
      });
      // remove the properties hash now that we've gotten what we need
      delete model.properties;
      // update the item with the newly re-interpolated model
      return Promise.all([
        updateItem({
          item: serializeModel(model),
          authentication
        }),
        authentication.getUsername()
      ]);
    })
    .then((responses: any[]) => {
      const username = responses[1];
      // add the resources
      const failSafeAddItemResource = failSafe(addItemResource, {
        success: true
      });
      const resourcePromises = resources.map(resource => {
        return failSafeAddItemResource({
          id: model.item.id,
          owner: username,
          resource: resource.file,
          name: resource.name,
          authentication
        });
      });
      // Fire and forget as these are not critical-path
      return Promise.all(resourcePromises);
    })
    .then(() => {
      // Move it
      return moveItem({
        itemId: model.item.id,
        folderId,
        authentication
      });
    })
    .then(() => {
      return model;
    });
}
