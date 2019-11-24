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
 * Manages creation of the template of a Solution item via the REST API.
 *
 * @module createSolutionItem
 */

import * as common from "@esri/solution-common";
import * as featureLayer from "@esri/solution-feature-layer";
import * as simpleTypes from "@esri/solution-simple-types";
import * as storyMap from "@esri/solution-storymap";

/**
 * Mapping from item type to module with type-specific template-handling code.
 * All of the AGO types listed in arcgis-portal-app\src\js\arcgisonline\pages\item\_Info.js
 * whether they are supported for solution items or not.
 */
const moduleMap: common.IItemTypeModuleMap = {
  "360 vr experience": null,
  "3d web scene": null,
  "appbuilder extension": null,
  "application configuration": null,
  application: null,
  "arcgis pro add in": null,
  "arcgis pro configuration": null,
  "arcpad package": null,
  "basemap package": null,
  "big data analytic": null,
  "cad drawing": null,
  "cityengine web scene": null,
  "code attachment": null,
  "code sample": null,
  "color set": null,
  "compact tile package": null,
  "csv collection": null,
  csv: null,
  dashboard: simpleTypes,
  "data store": null,
  "deep learning package": null,
  default: null,
  "desktop add in": null,
  "desktop application template": null,
  "desktop application": null,
  "desktop style": null,
  "document link": null,
  "elevation layer": null,
  "excalibur imagery project": null,
  "explorer add in": null,
  "explorer layer": null,
  "explorer map": null,
  "feature collection template": null,
  "feature collection": null,
  "feature service": featureLayer,
  feed: null,
  "file geodatabase": null,
  form: simpleTypes,
  "geocoding service": null,
  "geodata service": null,
  geojson: null,
  "geometry service": null,
  geopackage: null,
  "geoprocessing package": null,
  "geoprocessing sample": null,
  "geoprocessing service": null,
  "globe document": null,
  "globe service": null,
  group: simpleTypes,
  "hub initiative": null,
  "hub page": null,
  "hub site application": null,
  "image collection": null,
  "image service": null,
  image: null,
  "insights model": null,
  "insights page": null,
  "insights theme": null,
  "insights workbook": null,
  "iwork keynote": null,
  "iwork numbers": null,
  "iwork pages": null,
  "kml collection": null,
  kml: null,
  "layer package": null,
  "layer template": null,
  layer: null,
  layout: null,
  "locator package": null,
  "map document": null,
  "map image layer": null,
  "map package": null,
  "map service": null,
  "map template": null,
  markup: null,
  "microsoft excel": null,
  "microsoft powerpoint": null,
  "microsoft word": null,
  mission: null,
  "mobile application": null,
  "mobile basemap package": null,
  "mobile map package": null,
  "mobile scene package": null,
  "native application installer": null,
  "native application template": null,
  "native application": null,
  netcdf: null,
  "network analysis service": null,
  notebook: null,
  "operation view": null,
  "operations dashboard add in": null,
  "operations dashboard extension": null,
  "ortho mapping project": null,
  pdf: null,
  "pro layer package": null,
  "pro layer": null,
  "pro map package": null,
  "pro map": null,
  "pro report": null,
  "project package": null,
  "project template": null,
  "published map": null,
  "quickcapture project": null,
  "raster function template": null,
  "real time analytic": null,
  "relational database connection": null,
  "report template": null,
  "route layer": null,
  "rule package": null,
  "scene document": null,
  "scene layer package": null,
  "scene service": null,
  shapefile: null,
  "site application": null,
  "site initiative": null,
  "site page": null,
  solution: null,
  "statistical data collection": null,
  storymap: null,
  "stream service": null,
  style: null,
  "survey123 add in": null,
  "symbol set": null,
  table: null,
  "task file": null,
  "tile package": null,
  tool: null,
  "toolbox package": null,
  "urban model": null,
  "vector tile package": null,
  "vector tile service": null,
  "viewer configuration": null,
  "visio document": null,
  "web experience template": null,
  "web experience": null,
  "web map": simpleTypes,
  "web mapping application": simpleTypes,
  "web scene": null,
  wfs: null,
  "window mobile package": null,
  "windows mobile package": null,
  "windows viewer add in": null,
  "windows viewer configuration": null,
  wms: null,
  wmts: null,
  "workflow manager package": null,
  "workflow manager service": null,
  "workforce project": null
};

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Creates template for an AGO item and its dependencies
 *
 * @param solutionItemId The solution to contain the item
 * @param itemId AGO id string
 * @param authentication Authentication for requesting information from AGO about items to be included in solution item
 * @param existingTemplates A collection of AGO item templates that can be referenced by newly-created templates
 * @return A promise that will resolve with the created template items
 * @protected
 */
export function createItemTemplate(
  solutionItemId: string,
  itemId: string,
  templateDictionary: any,
  authentication: common.UserSession,
  existingTemplates: common.IItemTemplate[]
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Check if item and its dependents are already in list or are queued
    if (common.findTemplateInList(existingTemplates, itemId)) {
      resolve(true);
    } else {
      // Add the id as a placeholder to show that it is being fetched
      existingTemplates.push(common.createPlaceholderTemplate(itemId));
      /* console.log(
        "added placeholder template " +
          itemId +
          " [" +
          existingTemplates.length +
          "]"
      ); */

      // For each item,
      //   * fetch item & data infos
      //   * create item & data JSONs
      //   * extract dependency ids & add them into list of group contents
      //   * templatize select components in item & data JSONs (e.g., extents)
      //   * copy item's resources, metadata, & thumbnail to solution item as resources
      //   * add JSONs to solution item's data JSON accumulation
      // Fetch the item
      /* console.log("fetching item " + itemId); */
      common.getItem(itemId, authentication).then(
        itemInfo => {
          if (common.getProp(itemInfo, "extent")) {
            // @ts-ignore
            itemInfo.extent = "{{solutionItemExtent}}";
          }
          // Check if this is the solution's thumbnail
          if (itemInfo.tags.find(tag => tag === "deploy.thumbnail")) {
            // Set the thumbnail
            const thumbnailUrl =
              authentication.portal + "/content/items/" + itemId + "/data";
            common.getBlob(thumbnailUrl, authentication).then(
              blob =>
                common
                  .addThumbnailFromBlob(blob, solutionItemId, authentication)
                  .then(
                    () => resolve(true),
                    () => resolve(true)
                  ),
              () => resolve(true)
            );
          } else {
            const itemHandler = moduleMap[itemInfo.type.toLowerCase()];
            if (!itemHandler) {
              console.warn(
                "Unimplemented item type (module level) " +
                  itemInfo.type +
                  " for " +
                  itemInfo.id
              );
              resolve(true);
            } else {
              console.log(
                "Templatizing item type (module level) " +
                  itemInfo.type +
                  " for " +
                  itemInfo.id
              );
              itemHandler
                .convertItemToTemplate(solutionItemId, itemInfo, authentication)
                .then(
                  itemTemplate => {
                    // Set the value keyed by the id to the created template, replacing the placeholder template
                    _replaceTemplate(
                      existingTemplates,
                      itemTemplate.itemId,
                      itemTemplate
                    );

                    // Trace item dependencies
                    if (itemTemplate.dependencies.length === 0) {
                      resolve(true);
                    } else {
                      // Get its dependencies, asking each to get its dependents via
                      // recursive calls to this function
                      const dependentDfds: Array<Promise<boolean>> = [];
                      /* console.log(
                        "item " +
                          itemId +
                          " has dependencies " +
                          JSON.stringify(itemTemplate.dependencies)
                      ); */
                      itemTemplate.dependencies.forEach(dependentId => {
                        if (
                          !common.findTemplateInList(
                            existingTemplates,
                            dependentId
                          )
                        ) {
                          dependentDfds.push(
                            createItemTemplate(
                              solutionItemId,
                              dependentId,
                              templateDictionary,
                              authentication,
                              existingTemplates
                            )
                          );
                        }
                      });
                      Promise.all(dependentDfds).then(
                        () => resolve(true),
                        e => reject(common.fail(e))
                      );
                    }
                  },
                  e => reject(common.fail(e))
                );
            }
          }
        },
        () => {
          // If item query fails, try URL for group base section
          /* console.log("fetching group " + itemId); */
          common.getGroup(itemId, authentication).then(
            itemInfo => {
              simpleTypes
                .convertItemToTemplate(
                  solutionItemId,
                  itemInfo,
                  authentication,
                  true
                )
                .then(
                  itemTemplate => {
                    // Set the value keyed by the id to the created template, replacing the placeholder template
                    _replaceTemplate(
                      existingTemplates,
                      itemTemplate.itemId,
                      itemTemplate
                    );

                    // Trace item dependencies
                    if (itemTemplate.dependencies.length === 0) {
                      resolve(true);
                    } else {
                      // Get its dependencies, asking each to get its dependents via
                      // recursive calls to this function
                      const dependentDfds: Array<Promise<boolean>> = [];
                      /* console.log(
                        "item " +
                          itemId +
                          " has dependencies " +
                          JSON.stringify(itemTemplate.dependencies)
                      ); */
                      itemTemplate.dependencies.forEach(dependentId => {
                        if (
                          !common.findTemplateInList(
                            existingTemplates,
                            dependentId
                          )
                        ) {
                          dependentDfds.push(
                            createItemTemplate(
                              solutionItemId,
                              dependentId,
                              templateDictionary,
                              authentication,
                              existingTemplates
                            )
                          );
                        }
                      });
                      Promise.all(dependentDfds).then(
                        () => resolve(true),
                        e => reject(common.fail(e))
                      );
                    }
                  },
                  e => reject(common.fail(e))
                );
            },
            e => reject(common.fail(e))
          );
        }
      );
    }
  });
}

/**
 * Templatizes field references within specific template types.
 * Currently only handles web applications
 *
 * @param templates List of solution templates
 * @return A list of templates that have templatized field references
 */
export function postProcessFieldReferences(
  templates: common.IItemTemplate[]
): common.IItemTemplate[] {
  const datasourceInfos: common.IDatasourceInfo[] = _getDatasourceInfos(
    templates
  );
  const templateTypeHash: any = _getTemplateTypeHash(templates);

  return templates.map(template => {
    if (
      template.type === "Web Mapping Application" ||
      template.type === "Dashboard" ||
      template.type === "Web Map"
    ) {
      const webMapFSDependencies: string[] = _getWebMapFSDependencies(
        template,
        templateTypeHash
      );
      const itemHandler: any = moduleMap[template.item.type.toLowerCase()];
      if (itemHandler) {
        const dependencies: string[] = webMapFSDependencies.concat(
          template.dependencies
        );
        let dependantDatasources: common.IDatasourceInfo[] = datasourceInfos.filter(
          ds => {
            if (dependencies.indexOf(ds.itemId) > -1) {
              return ds;
            }
          }
        );
        dependantDatasources = _addMapLayerIds(
          dependantDatasources,
          templateTypeHash
        );
        if (dependantDatasources.length > 0) {
          template = itemHandler.postProcessFieldReferences(
            template,
            dependantDatasources,
            template.item.type
          );
        }
      }
    }
    return template;
  });
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Get common properties that will support the templatization of field references
 *
 * @param templates List of solution templates
 * @return A list of IDataSourceInfo objects with key properties
 */
export function _getDatasourceInfos(
  templates: common.IItemTemplate[]
): common.IDatasourceInfo[] {
  const datasourceInfos: common.IDatasourceInfo[] = [];
  templates.forEach(t => {
    if (t.type === "Feature Service") {
      const layers: any[] = common.getProp(t, "properties.layers") || [];
      const tables: any[] = common.getProp(t, "properties.tables") || [];
      const layersAndTables: any[] = layers.concat(tables);
      layersAndTables.forEach(obj => {
        if (!common.hasDatasource(datasourceInfos, t.itemId, obj.id)) {
          datasourceInfos.push({
            itemId: t.itemId,
            layerId: obj.id,
            fields: obj.fields,
            basePath: t.itemId + ".layer" + obj.id + ".fields",
            url: common.getProp(t, "item.url"),
            ids: [],
            relationships: obj.relationships || [],
            adminLayerInfo: obj.adminLayerInfo || {}
          });
        }
      });
    }
  });
  return datasourceInfos;
}

/**
 * Creates a simple lookup object to quickly understand an items type and dependencies
 * and associated web map layer ids based on itemId
 *
 * @param templates List of solution templates
 * @return The lookup object with type, dependencies, and webmap layer info
 */
export function _getTemplateTypeHash(templates: common.IItemTemplate[]): any {
  const templateTypeHash: any = {};
  templates.forEach(template => {
    templateTypeHash[template.itemId] = {
      type: template.type,
      dependencies: template.dependencies
    };
    if (template.type === "Web Map") {
      _updateWebMapHashInfo(template, templateTypeHash[template.itemId]);
    }
  });
  return templateTypeHash;
}

/**
 * Updates the lookup object with webmap layer info
 * so we can know the id used within a map for a given feature service
 *
 * @param template A webmap solution template
 * @return The lookup object with webmap layer info added
 */
export function _updateWebMapHashInfo(
  template: common.IItemTemplate,
  hashItem: any
) {
  const operationalLayers: any[] =
    common.getProp(template, "data.operationalLayers") || [];

  const tables: any[] = common.getProp(template, "data.tables") || [];
  const layersAndTables: any[] = operationalLayers.concat(tables);
  if (layersAndTables && layersAndTables.length > 0) {
    hashItem.layersAndTables = [];
    layersAndTables.forEach(layer => {
      const obj: any = {};
      let itemId: any;
      if (layer.itemId) {
        itemId = layer.itemId;
      } else if (layer.url && layer.url.indexOf("{{") > -1) {
        // some layers like heatmap layer don't have a itemId
        itemId = layer.url
          .replace("{{", "")
          .replace(/([.]layer([0-9]|[1-9][0-9])[.]url)[}]{2}/, "");
      }
      if (itemId) {
        obj[common.cleanLayerBasedItemId(itemId)] = {
          id: layer.id,
          url: layer.url
        };
        hashItem.layersAndTables.push(obj);
      }
    });
  }
}

/**
 * Updates the datasource info objects by passing the webmap layer IDs from the lookup hash
 * to the underlying feature service datasource infos
 *
 * @param datasourceInfos A webmap solution template
 * @param templateTypeHash A simple lookup object populated with key item info
 * @return The updated datasource infos
 */
export function _addMapLayerIds(
  datasourceInfos: common.IDatasourceInfo[],
  templateTypeHash: any
): common.IDatasourceInfo[] {
  const webMapIds: any[] = Object.keys(templateTypeHash).filter(k => {
    if (templateTypeHash[k].type === "Web Map") {
      return templateTypeHash[k];
    }
  });

  return datasourceInfos.map(ds => {
    webMapIds.forEach(webMapId => {
      templateTypeHash[webMapId].layersAndTables.forEach((opLayer: any) => {
        const opLayerInfo: any = opLayer[ds.itemId];
        const url: string =
          ds.url && !isNaN(ds.layerId)
            ? ds.url.replace(/[.]/, ".layer" + ds.layerId + ".")
            : "";
        if (
          opLayerInfo &&
          url === opLayerInfo.url &&
          ds.ids.indexOf(opLayerInfo.id) < 0
        ) {
          ds.ids.push(opLayerInfo.id);
        }
      });
    });
    return ds;
  });
}

/**
 * Get feature service item IDs from applications webmaps
 * As they are not explict dependencies of the application but are needed for field references
 *
 * @param template A webmap solution template
 * @param templateTypeHash A simple lookup object populated with key item info
 * @return A lsit of feature service item IDs
 */
export function _getWebMapFSDependencies(
  template: common.IItemTemplate,
  templateTypeHash: any
): string[] {
  const webMapFSDependencies: string[] = [];
  template.dependencies.forEach(dep => {
    const depObj: any = templateTypeHash[dep];
    if (depObj.type === "Web Map") {
      depObj.dependencies.forEach((depObjDependency: string) => {
        if (templateTypeHash[depObjDependency].type === "Feature Service") {
          webMapFSDependencies.push(depObjDependency);
        }
      });
    }
  });
  return webMapFSDependencies;
}

/**
 * Replaces a template entry in a list of templates
 *
 * @param templates A collection of AGO item templates
 * @param id Id of item in templates list to find; if not found, no replacement is () => done()
 * @param template Replacement template
 * @return True if replacement was made
 * @protected
 */
export function _replaceTemplate(
  templates: common.IItemTemplate[],
  id: string,
  template: common.IItemTemplate
): boolean {
  const i = common.findTemplateIndexInList(templates, id);
  if (i >= 0) {
    templates[i] = template;
    return true;
  }
  return false;
}
