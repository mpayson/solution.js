/* Copyright (c) 2018 Esri
 * Apache-2.0 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var AgolItem = /** @class */ (function () {
        function AgolItem(itemSection) {
            if (itemSection.type) {
                this.type = itemSection.type;
            }
            this.dependencies = [];
            this.itemSection = itemSection;
            this.removeUncloneableItemProperties();
        }
        AgolItem.prototype.init = function (requestOptions) {
            var _this = this;
            return new Promise(function (resolve) {
                resolve(_this);
            });
        };
        AgolItem.prototype.removeUncloneableItemProperties = function () {
            var itemSection = this.itemSection;
            delete itemSection.avgRating;
            delete itemSection.created;
            delete itemSection.modified;
            delete itemSection.numComments;
            delete itemSection.numRatings;
            delete itemSection.numViews;
            delete itemSection.orgId;
            delete itemSection.owner;
            delete itemSection.scoreCompleteness;
            delete itemSection.size;
            delete itemSection.uploaded;
        };
        return AgolItem;
    }());
    exports.AgolItem = AgolItem;
});
//# sourceMappingURL=agolItem.js.map