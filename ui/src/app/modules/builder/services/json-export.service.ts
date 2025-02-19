import { Injectable } from '@angular/core';
import { JsonAttributeNode, JsonRootNode } from '../models/builder.model';
import { isListBasedBasicType, isMultiCardinality } from '../utils/node.util';
import { isStructuredType } from '../utils/type-guards.util';

@Injectable({
  providedIn: 'root',
})
export class JsonExportService {
  constructor() {}

  export(jsonRootNode: JsonRootNode): any {
    const jsonObject = {};
    this.exportChildren(jsonRootNode.children, jsonObject);
    return jsonObject;
  }

  private exportChildren(
    jsonAttributeNodes: JsonAttributeNode[],
    jsonObject: any
  ) {
    jsonAttributeNodes.forEach((jsonAttributeNode) => {
      const definitionName = jsonAttributeNode.definition.name;
      const isMeta = jsonAttributeNode.definition.metaField || false;
      let isArray = false;

      if (isMultiCardinality(jsonAttributeNode.definition)) {
        if (!jsonObject[definitionName]) {
          jsonObject[definitionName] = [];
        }
        isArray = true;
      }

      if (
        isStructuredType(jsonAttributeNode.definition.type) &&
        jsonAttributeNode.children
      ) {
        this.buildIntermediateNode(
          isMeta,
          isArray,
          jsonObject,
          definitionName,
          jsonAttributeNode
        );
      } else {
        this.buildLeafNode(
          isMeta,
          jsonAttributeNode,
          jsonObject,
          definitionName
        );
      }
    });
  }

  private buildLeafNode(
    isMeta: boolean,
    jsonAttributeNode: JsonAttributeNode,
    jsonObject: any,
    definitionName: string
  ) {
    const shouldWrapValue = jsonAttributeNode.definition.metaField;
    const isStructured = isStructuredType(jsonAttributeNode.definition.type);
    const shouldWrapThisValue = shouldWrapValue && (!isStructured || jsonAttributeNode.definition.name === 'personId');

    if (jsonAttributeNode.definition.name === 'equityType') {
      jsonObject[definitionName] = Array.isArray(jsonAttributeNode.value) ? jsonAttributeNode.value[0] : jsonAttributeNode.value;
      return;
    }

    if (!shouldWrapValue && !isStructured) {
      jsonObject[definitionName] = Array.isArray(jsonAttributeNode.value) ? jsonAttributeNode.value[0] : jsonAttributeNode.value;
      return;
    }

    if (
      isListBasedBasicType(jsonAttributeNode) &&
      Array.isArray(jsonAttributeNode.value)
    ) {
      const newValues = jsonAttributeNode.value.map((val) => {
        if (shouldWrapValue && !isStructured) {
          return { value: val };
        }
        return val;
      });

      const fieldIsMultiCardinality = isMultiCardinality(
        jsonAttributeNode.definition
      );

      if (!fieldIsMultiCardinality && newValues.length > 1) {
        throw Error('Single cardinality field has multiple values');
      }

      jsonObject[definitionName] = fieldIsMultiCardinality
        ? newValues
        : newValues[0];
    } else {
      const newValue = shouldWrapThisValue
        ? { value: jsonAttributeNode.value }
        : jsonAttributeNode.value;
      jsonObject[definitionName] = newValue;
    }
  }

  private buildIntermediateNode(
    isMeta: boolean,
    isArray: boolean,
    jsonObject: any,
    definitionName: string,
    jsonAttributeNode: JsonAttributeNode
  ) {
    if (!jsonAttributeNode.children) {
      throw Error('Intermediate nodes must have children');
    }

    if (jsonAttributeNode.definition.name === 'equityType') {
      jsonObject[definitionName] = Array.isArray(jsonAttributeNode.value) ? jsonAttributeNode.value[0] : jsonAttributeNode.value;
      return;
    }

    const shouldWrapValue = jsonAttributeNode.definition.metaField;
    const isStructured = isStructuredType(jsonAttributeNode.definition.type);
    const shouldWrapThisValue = shouldWrapValue && (!isStructured || jsonAttributeNode.definition.name === 'personId');
    const child = {};

    if (isArray) {
      if (shouldWrapThisValue) {
        const wrappedChild = { value: child };
        jsonObject[definitionName].push(wrappedChild);
        this.exportChildren(jsonAttributeNode.children, wrappedChild.value);
      } else {
        jsonObject[definitionName].push(child);
        this.exportChildren(jsonAttributeNode.children, child);
      }
    } else {
      if (shouldWrapThisValue) {
        const wrappedChild = { value: child };
        jsonObject[definitionName] = wrappedChild;
        this.exportChildren(jsonAttributeNode.children, wrappedChild.value);
      } else {
        jsonObject[definitionName] = child;
        this.exportChildren(jsonAttributeNode.children, child);
      }
    }
  }
}
