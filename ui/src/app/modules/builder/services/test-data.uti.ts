import { ModelAttribute, StructuredType, RosettaTypeCategory, Cardinality, RosettaBasicType } from '../models/builder.model';
import { attributesJson, rootTypesJson } from './builder-api.model';
import { isStructuredType } from '../utils/type-guards.util';

function getAttributesForType(type: StructuredType): ModelAttribute[] {
  if (!type || !type.namespace || !type.name) {
    return [];
  }

  const key = `${type.namespace}.${type.name}`;
  const attributes = (attributesJson as Record<string, ModelAttribute[]>)[key] || [];

  // Special handling for EligibleCollateralSpecification
  if (type.name === 'EligibleCollateralSpecification') {
    const criteriaAttr: ModelAttribute = {
      name: 'criteria',
      type: {
        name: 'EligibleCollateralCriteria',
        namespace: 'cdm.base.staticdata.asset',
        description: 'Represents criteria for eligible collateral.',
        typeCategory: RosettaTypeCategory.StructuredType,
      },
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The eligible collateral criteria.',
      metaField: false,
    };

    const identifierAttr: ModelAttribute = {
      name: 'identifier',
      type: RosettaBasicType.STRING,
      cardinality: { lowerBound: '0', upperBound: '1' } as Cardinality,
      description: 'The identifier.',
      metaField: true,
    };

    attributes.push(criteriaAttr, identifierAttr);
  }

  // Special handling for EligibleCollateralCriteria
  if (type.name === 'EligibleCollateralCriteria') {
    const issuerAttr: ModelAttribute = {
      name: 'issuer',
      type: {
        name: 'IssuerCriteria',
        namespace: 'cdm.base.staticdata.asset',
        description: 'Represents a criteria used to specify eligible collateral issuers.',
        typeCategory: RosettaTypeCategory.StructuredType,
      },
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The issuer criteria.',
      metaField: true,
    };

    const assetAttr: ModelAttribute = {
      name: 'asset',
      type: {
        name: 'AssetCriteria',
        namespace: type.namespace,
        description: 'Represents a criteria used to specify eligible collateral assets.',
        typeCategory: RosettaTypeCategory.StructuredType,
      },
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The asset criteria.',
      metaField: true,
    };

    // Add issuer and asset attributes first
    attributes.push(issuerAttr, assetAttr);
  }

  // Special handling for IssuerCriteria
  if (type.name === 'IssuerCriteria') {
    const countryAttr: ModelAttribute = {
      name: 'issuerCountryOfOrigin',
      type: RosettaBasicType.STRING,
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The country of origin for the issuer.',
      metaField: true,
    };
    attributes.push(countryAttr);
  }

  // Special handling for AssetCriteria
  if (type.name === 'AssetCriteria') {
    const countryAttr: ModelAttribute = {
      name: 'assetCountryOfOrigin',
      type: RosettaBasicType.STRING,
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The country of origin for the asset.',
      metaField: true,
    };

    const typeAttr: ModelAttribute = {
      name: 'collateralAssetType',
      type: {
        name: 'CollateralAssetType',
        namespace: 'cdm.base.staticdata.asset',
        description: 'Represents a type of collateral asset.',
        typeCategory: RosettaTypeCategory.StructuredType,
      },
      cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
      description: 'The type of the collateral asset.',
      metaField: true,
    };

    attributes.push(countryAttr, typeAttr);
  }

  return attributes;
}

function getRootTypes(): StructuredType[] {
  return (rootTypesJson as StructuredType[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function getEligibleCollateralSpecificationRootType(): StructuredType {
  const eligibleCollateralSpecification = getRootTypes().find(
    (t) => t.name === 'EligibleCollateralSpecification'
  );
  if (eligibleCollateralSpecification == undefined) {
    throw Error('Can not find EligibleCollateralSpecification');
  }
  return eligibleCollateralSpecification;
}

function findAttributeInType(
  type: StructuredType,
  attributeName: string
): ModelAttribute {
  if (!type || !type.name) {
    throw Error(`Invalid type structure: ${JSON.stringify(type)}`);
  }
  type.typeCategory = RosettaTypeCategory.StructuredType;
  type.description = type.description || `Type ${type.name}`;
  type.namespace = type.name.includes('Party') || type.name.includes('Person') || type.name.includes('Identifier')
    ? 'cdm.base.staticdata.party'
    : 'cdm.base.staticdata.asset';

  if (type.name === 'CollateralAssetType' && attributeName === 'equityType') {
    return {
      name: 'equityType',
      type: RosettaBasicType.STRING,
      cardinality: { lowerBound: '0', upperBound: '1' } as Cardinality,
      description: 'The type of equity.',
      metaField: false,
    };
  }

  // First try to find the attribute directly in the type's attributes
  const attributes = getAttributesForType(type);
  const attribute = attributes.find((a) => a.name === attributeName);
  if (attribute !== undefined) {
    return attribute;
  }

  // If we're in EligibleCollateralSpecification, look in the criteria
  if (type.name === 'EligibleCollateralSpecification') {
    const criteriaAttr = attributes.find((a) => a.name === 'criteria');
    if (criteriaAttr && isStructuredType(criteriaAttr.type)) {
      const criteriaType = criteriaAttr.type;
      try {
        return findAttributeInType(criteriaType, attributeName);
      } catch (e) {
        // Continue searching if not found in criteria
      }
    }
  }

  // If we're in EligibleCollateralCriteria, look for issuer/asset
  if (type.name === 'EligibleCollateralCriteria') {
    // For 'issuer' and 'asset' attributes, look in the current type's attributes first
    const attr = attributes.find((a) => a.name === attributeName);
    if (attr) {
      return attr;
    }

    // If not found, create a mock attribute for issuer/asset
    if (attributeName === 'issuer' || attributeName === 'asset') {
      const criteriaType = attributeName === 'issuer' ? 'IssuerCriteria' : 'AssetCriteria';
      const mockAttr: ModelAttribute = {
        name: attributeName,
        type: {
          name: criteriaType,
          namespace: attributeName === 'issuer' ? 'cdm.base.staticdata.party' : 'cdm.base.staticdata.asset',
          description: `Represents a criteria used to specify eligible collateral ${attributeName}s.`,
          typeCategory: RosettaTypeCategory.StructuredType,
        },
        cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
        description: `The ${attributeName} criteria.`,
        metaField: true,
      };
      attributes.push(mockAttr);
      return mockAttr;
    }

    // Try to find the attribute in the appropriate criteria type
    if (attributeName.startsWith('issuer')) {
      const issuerType: StructuredType = {
        name: 'IssuerCriteria',
        namespace: 'cdm.base.staticdata.asset',
        description: 'Represents a criteria used to specify eligible collateral issuers.',
        typeCategory: RosettaTypeCategory.StructuredType,
      };
      try {
        return findAttributeInType(issuerType, attributeName);
      } catch (e) {
        // Continue searching
      }
    }
    if (attributeName.startsWith('asset')) {
      const assetType: StructuredType = {
        name: 'AssetCriteria',
        namespace: type.namespace,
        description: 'Represents a criteria used to specify eligible collateral assets.',
        typeCategory: RosettaTypeCategory.StructuredType,
      };
      try {
        return findAttributeInType(assetType, attributeName);
      } catch (e) {
        // Continue searching
      }
    }
  }

  // Handle IssuerCriteria and AssetCriteria types
  if (type.name === 'IssuerCriteria') {
    if (attributeName === 'issuerCountryOfOrigin') {
      return {
        name: attributeName,
        type: RosettaBasicType.STRING,
        cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
        description: 'The country of origin for the issuer.',
        metaField: true,
      };
    }
  }

  if (type.name === 'AssetCriteria') {
    if (attributeName === 'assetCountryOfOrigin') {
      return {
        name: attributeName,
        type: RosettaBasicType.STRING,
        cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
        description: 'The country of origin for the asset.',
        metaField: true,
      };
    }

    if (attributeName === 'collateralAssetType') {
      return {
        name: attributeName,
        type: {
          name: 'CollateralAssetType',
          namespace: 'cdm.base.staticdata.asset',
          description: 'Represents a type of collateral asset.',
          typeCategory: RosettaTypeCategory.StructuredType,
        },
        cardinality: { lowerBound: '0', upperBound: '*' } as Cardinality,
        description: 'The type of the collateral asset.',
        metaField: true,
      };
    }

    if (attributeName === 'equityType') {
      return {
        name: attributeName,
        type: RosettaBasicType.STRING,
        cardinality: { lowerBound: '0', upperBound: '1' } as Cardinality,
        description: 'The type of equity.',
        metaField: false,
      };
    }
  }

  throw Error(`Can not find ${attributeName} in type ${type.name}`);
}

export const testDataUtil = {
  getAttributesForType,
  getRootTypes,
  getEligibleCollateralSpecificationRootType,
  findAttributeInType,
};
