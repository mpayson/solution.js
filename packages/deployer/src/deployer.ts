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
 * Manages the deployment of a Solution.
 *
 * @module deployer
 */

import * as common from "@esri/solution-common";

import { _deploySolutionFromTemplate } from "./deploySolutionFromTemplate";
import {
  _getSolutionTemplateItem,
  isSolutionTemplateItem,
  _updateDeployOptions
} from "./deployerUtils";
import { IModel } from "@esri/hub-common";

/**
 * Deploy a Solution
 * Pass in either the item id or an IModel (`{item:{}, model:{}}`)
 * of a Solution Template, and this will generate the Solution
 * @param maybeModel Item Id or IModel
 * @param authentication UserSession
 * @param options object
 */
export function deploySolution(
  maybeModel: string | IModel,
  authentication: common.UserSession,
  options?: common.IDeploySolutionOptions
): Promise<string> {
  // if we are not passed the maybeModel, reject
  if (!maybeModel) {
    return Promise.reject(common.fail("The Solution Template id is missing"));
  }
  let deployOptions: common.IDeploySolutionOptions = options || {};
  /* istanbul ignore else */
  if (deployOptions.progressCallback) {
    deployOptions.progressCallback(1); // let the caller know that we've started
  }
  // deal with maybe getting an item or an id
  return _getSolutionTemplateItem(maybeModel, authentication)
    .then(model => {
      if (!isSolutionTemplateItem(model.item)) {
        return Promise.reject(
          common.fail(`${model.item.id} is not a Solution Template`)
        );
      } else {
        // fetch the metadata and pass the item & data forward
        return Promise.all([
          Promise.resolve(model.item),
          Promise.resolve(model.data),
          common.getItemMetadataAsFile(model.item.id, authentication)
        ]);
      }
    })
    .then(responses => {
      // extract responses
      const [itemBase, itemData, itemMetadata] = responses;
      // sanitize all the things
      const sanitizer = new common.Sanitizer();
      const item = common.sanitizeJSONAndReportChanges(itemBase, sanitizer);
      // TODO: we should delegate data sanization to the type-specific modules
      const data = common.sanitizeJSONAndReportChanges(itemData, sanitizer);
      // apply item props to deployOptions
      deployOptions = _updateDeployOptions(deployOptions, item, authentication);
      // Clone before mutating? This was messing me up in some testing...
      common.deleteItemProps(item);

      return _deploySolutionFromTemplate(
        item.id,
        item,
        data,
        itemMetadata,
        authentication,
        deployOptions
      );
    })
    .then(
      createdSolutionId => {
        /* istanbul ignore else */
        if (deployOptions.progressCallback) {
          deployOptions.progressCallback(100); // we're done
        }
        return createdSolutionId;
      },
      error => {
        // Error deploying solution
        /* istanbul ignore else */
        if (deployOptions.progressCallback) {
          deployOptions.progressCallback(1);
        }
        return Promise.reject(error);
      }
    )
    .catch(ex => {
      throw ex;
    });
}
