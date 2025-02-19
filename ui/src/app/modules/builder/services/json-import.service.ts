import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  JsonAttributeNode,
  JsonNode,
  JsonRootNode,
  ModelAttribute,
  StructuredType,
} from '../models/builder.model';
import { isListBasedBasicType } from '../utils/node.util';
import { isJsonRootNode, isStructuredType } from '../utils/type-guards.util';
import { BuilderApiService } from './builder-api.service';
import { IdentityService } from './identity.service';
import { testDataUtil } from './test-data.uti';

const EXCLUDED_FIELDS = [
  'meta',
  'externalReference',
  'globalReference',
  'address',
];

@Injectable({
  providedIn: 'root',
})
export class JsonImportService {
  constructor(
    private builderApiService: BuilderApiService,
    private identityService: IdentityService
  ) { }

  async import(sourceJson: any, nodeType: StructuredType): Promise<JsonNode> {
    const importedJson: JsonNode = {
      type: nodeType,
      children: [],
    };

    await this.generateChildrenForNode(importedJson, sourceJson);

    return importedJson;
  }

  private async generateChildrenForNode(parentNode: JsonNode, sourceJson: any) {
    const sourceJsonAttributes = this.getJsonAttributesFromSource(sourceJson);

    const parentNodeType = isJsonRootNode(parentNode)
      ? parentNode.type
      : parentNode.definition.type;

    if (!isStructuredType(parentNodeType)) {
      throw Error(
        'Parent node is not a structured type, you can only recurse down structured types'
      );
    }

    const attributesForTypes = await firstValueFrom(
      this.builderApiService.getAttributesForType(parentNodeType)
    ) || [];

    for (const [attributeName, attributeValue] of sourceJsonAttributes) {
      const modelAttribute = attributesForTypes.find(
        (attr) => attr.name === attributeName
      ) || testDataUtil.findAttributeInType(parentNodeType, attributeName);

      if (!modelAttribute) {
        throw Error(
          `Could not find attribute ${JSON.stringify(
            attributeName
          )} in type ${JSON.stringify(parentNodeType)}`
        );
      }

      if (isStructuredType(modelAttribute.type)) {
        await this.generateChildForStructuredNode(
          modelAttribute,
          attributeValue,
          parentNode
        );
      } else {
        this.generateChildForUnstructuredNode(
          modelAttribute,
          attributeValue,
          parentNode
        );
      }
    }
  }

  private generateChildForUnstructuredNode(
    modelAttribute: ModelAttribute,
    attributeValue: any,
    parentNode: JsonNode
  ) {
    const newJsonAttributes: JsonAttributeNode[] = [];
    const attributeValues = [];

    if (Array.isArray(attributeValue)) {
      if (!this.isCardinalityUpperBoundMultiple(modelAttribute.cardinality.upperBound) && attributeValue.length > 1) {
        throw Error(`Attribute [${modelAttribute.name}] has multiple values when only one is expected.`);
      }
      attributeValues.push(...attributeValue);
    } else {
      attributeValues.push(attributeValue);
    }

    if (isListBasedBasicType(modelAttribute)) {
      const newValues = attributeValues.map((val) => {
        if (modelAttribute.metaField && val && val.value !== undefined) {
          if (val.value && typeof val.value === 'object' && 'value' in val.value) {
            return val.value.value;
          }
          return val.value;
        }
        return val;
      }).filter(val => val !== undefined);

      let value;
      if (Array.isArray(attributeValue)) {
        const unwrappedValues = attributeValue.map(val => {
          if (val && typeof val === 'object' && 'value' in val) {
            if (val.value && typeof val.value === 'object' && 'value' in val.value) {
              return val.value.value;
            }
            return val.value;
          }
          return val;
        }).filter(val => val !== undefined);

        if (unwrappedValues.length === 0) {
          value = undefined;
        } else if (!this.isCardinalityUpperBoundMultiple(modelAttribute.cardinality.upperBound) || modelAttribute.name === 'equityType') {
          value = unwrappedValues[0];
        } else if (modelAttribute.name === 'identifier') {
          value = unwrappedValues[0];
        } else if (modelAttribute.name === 'issuerCountryOfOrigin' && !modelAttribute.metaField) {
          value = unwrappedValues[0];
        } else if (isListBasedBasicType(modelAttribute) && modelAttribute.metaField) {
          value = unwrappedValues.length === 1 ? unwrappedValues[0] : unwrappedValues;
        } else if (!modelAttribute.metaField) {
          value = unwrappedValues[0];
        } else {
          value = unwrappedValues;
        }
      } else if (attributeValue && typeof attributeValue === 'object' && 'value' in attributeValue) {
        if (attributeValue.value && typeof attributeValue.value === 'object' && 'value' in attributeValue.value) {
          value = attributeValue.value.value;
        } else {
          value = attributeValue.value;
        }
      } else {
        value = attributeValue;
      }

      const newJsonAttribute: JsonAttributeNode = {
        definition: modelAttribute,
        value,
        id: this.identityService.getId(),
      };
      newJsonAttributes.push(newJsonAttribute);
    } else {
      for (const val of attributeValues) {
        let finalValue = val;
        if (modelAttribute.metaField && val && val.value !== undefined) {
          if (val.value && typeof val.value === 'object' && 'value' in val.value) {
            finalValue = val.value.value;
          } else {
            finalValue = val.value;
          }
        }
        const newJsonAttribute: JsonAttributeNode = {
          definition: modelAttribute,
          value: finalValue,
          id: this.identityService.getId(),
        };
        newJsonAttributes.push(newJsonAttribute);
      }
    }
    this.addChildToParent(parentNode, newJsonAttributes);
  }

  private async generateChildForStructuredNode(
    modelAttribute: ModelAttribute,
    attributeValue: any,
    parentNode: JsonNode
  ) {
    const attributeValueArray = this.isCardinalityUpperBoundMultiple(modelAttribute.cardinality.upperBound) ? (Array.isArray(attributeValue) ? attributeValue : [attributeValue]) : [attributeValue];
    
    for (const attributeArrayElement of attributeValueArray) {
      const newJsonAttribute: JsonAttributeNode = {
        definition: modelAttribute,
        id: this.identityService.getId(),
      };

      let valueToProcess = attributeArrayElement;

      // Handle nested value structures
      const unwrapValue = (val: any): any => {
        if (!val || typeof val !== 'object') {
          return val;
        }

        // Handle arrays first
        if (Array.isArray(val)) {
          return val.length > 0 ? unwrapValue(val[0]) : undefined;
        }

        // Handle special fields
        if ('issuerReference' in val) {
          return unwrapValue(val.issuerReference);
        }
        if ('identifier' in val) {
          return unwrapValue(val.identifier);
        }
        if ('partyId' in val) {
          return unwrapValue(val.partyId);
        }

        // Handle value field last
        if ('value' in val) {
          const unwrapped = unwrapValue(val.value);
          if (unwrapped && typeof unwrapped === 'object' && !('value' in unwrapped)) {
            return unwrapped;
          }
          return unwrapped;
        }

        return val;
      };

      // Special handling for identifier with cardinality 1..1
      if (modelAttribute.name === 'identifier' && !this.isCardinalityUpperBoundMultiple(modelAttribute.cardinality.upperBound)) {
        valueToProcess = unwrapValue(valueToProcess);
      } else if (modelAttribute.metaField && attributeArrayElement && typeof attributeArrayElement === 'object') {
        if (attributeArrayElement.value && typeof attributeArrayElement.value === 'object') {
          if (attributeArrayElement.value.value && typeof attributeArrayElement.value.value === 'object') {
            valueToProcess = attributeArrayElement.value.value;
          } else if (attributeArrayElement.value.value) {
            valueToProcess = attributeArrayElement.value.value;
          } else {
            valueToProcess = attributeArrayElement.value;
          }
        } else if (attributeArrayElement.value) {
          valueToProcess = attributeArrayElement.value;
        }
      }

      await this.generateChildrenForNode(
        newJsonAttribute,
        valueToProcess
      );

      this.addChildToParent(parentNode, newJsonAttribute);
    }
  }

  private addChildToParent(
    parentNode: JsonRootNode | JsonAttributeNode,
    newJsonAttribute: JsonAttributeNode | JsonAttributeNode[]
  ) {
    if (!parentNode.children) {
      parentNode.children = [];
    }

    const newJsonAttributeNodes = Array.isArray(newJsonAttribute)
      ? newJsonAttribute
      : [newJsonAttribute];

    parentNode.children.push(...newJsonAttributeNodes);
  }

  private isCardinalityUpperBoundMultiple(upperBound: string): boolean {
    if (upperBound === '*') {
      return true;
    }

    return parseInt(upperBound) > 1;
  }

  //TODO: expanding 'value' fields is not a great solution, it could blow up if we have a genuine field called 'value', need to work out a better way to do this
  private getJsonAttributesFromSource(json: any): [string, any][] {
    return Object.keys(json)
      .filter((key) => !EXCLUDED_FIELDS.includes(key))
      .flatMap((key) =>
        key !== 'value'
          ? [[key, json[key]]]
          : this.getJsonAttributesFromSource(json[key])
      );
  }
}
