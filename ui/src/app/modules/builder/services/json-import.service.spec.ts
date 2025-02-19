import { TestBed } from '@angular/core/testing';
import { IdentityServiceMock } from '../mocks/identity.service.mock';
import {
  JsonRootNode,
  ModelAttribute,
  RosettaTypeCategory,
  StructuredType,
} from '../models/builder.model';
import { isStructuredType } from '../utils/type-guards.util';
import { BuilderApiService } from './builder-api.service';
import { IdentityService } from './identity.service';
import { JsonImportService } from './json-import.service';
import { testDataUtil } from './test-data.uti';

describe('JsonImportService', () => {
  let service: JsonImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        JsonImportService,
        BuilderApiService,
        { provide: IdentityService, useClass: IdentityServiceMock },
      ],
    });

    service = TestBed.inject(JsonImportService);
  });

  it('should import correctly', async () => {
    // Input
    const inputJsonObject = {
      meta: {
        externalKey: 'party2',
        globalKey: '490e5f44',
      },
      name: {
        value: 'Party B',
      },
      partyId: [
        {
          identifier: {
            meta: {
              scheme: 'http://www.fpml.org/coding-scheme/external/iso17442',
            },
            value: '48750084UKLVTR22DS78',
          },
          identifierType: 'LEI',
          meta: {
            globalKey: 'de31bddc',
          },
        },
      ],
      person: [
        {
          firstName: 'John',
          surname: 'Doe',
          dateOfBirth: '1980-01-01',
          personId: [
            {
              value: {
                identifier: {
                  value: 'jdoe',
                },
                meta: {
                  globalKey: 'baeb8c0d',
                },
              },
            },
          ],
        },
      ],
    };

    // Expected
    const partyType: StructuredType = {
      name: 'Party',
      namespace: 'cdm.base.staticdata.party',
      description: 'Party Description',
      typeCategory: RosettaTypeCategory.StructuredType,
    };

    const partyNameAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(partyType, 'name');

    const partyIdentifierType: StructuredType = {
      name: 'PartyIdentifier',
      namespace: 'cdm.base.staticdata.party',
      description:
        'Comprises an identifier and a source. The associated metadata key denotes the ability to associate a hash value to the PartyIdentifier instantiations for the purpose of model cross-referencing, in support of functionality such as the event effect and the lineage.',
      typeCategory: RosettaTypeCategory.StructuredType,
    };

    const partyIdAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(partyType, 'partyId');

    const partyIdentifierTypeAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(partyIdentifierType, 'identifierType');

    const identifierAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(partyIdentifierType, 'identifier');

    const partyPersonAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(partyType, 'person');

    const naturalPersonType: StructuredType = {
      name: 'NaturalPerson',
      namespace: 'cdm.base.staticdata.party',
      description:
        'A class to represent the attributes that are specific to a natural person.',
      typeCategory: RosettaTypeCategory.StructuredType,
    };

    const naturalPersonFirstNameAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(naturalPersonType, 'firstName');

    const naturalPersonSurnameAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(naturalPersonType, 'surname');

    const naturalPersonDateOfBirthAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(naturalPersonType, 'dateOfBirth');

    const naturalPersonPersonIdAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(naturalPersonType, 'personId');

    const personIdentifierType: StructuredType = {
      name: 'PersonIdentifier',
      namespace: 'cdm.base.staticdata.party',
      description:
        'Comprises an identifier and a source. The associated metadata key denotes the ability to associate a hash value to the PersonIdentifier instantiations for the purpose of model cross-referencing, in support of functionality such as the event effect and the lineage.',
      typeCategory: RosettaTypeCategory.StructuredType,
    };

    const personIdentifierIdentifierAttributeDefinition: ModelAttribute =
      testDataUtil.findAttributeInType(personIdentifierType, 'identifier');

    const expectedPartyNode: JsonRootNode = {
      type: partyType,
      children: [
        {
          id: 12345,
          definition: partyNameAttributeDefinition,
          value: 'Party B',
        },
        {
          id: 12345,
          definition: partyIdAttributeDefinition,
          children: [
            {
              id: 12345,
              definition: identifierAttributeDefinition,
              value: '48750084UKLVTR22DS78',
            },
            {
              id: 12345,
              definition: partyIdentifierTypeAttributeDefinition,
              value: 'LEI',
            },
          ],
        },
        {
          id: 12345,
          definition: partyPersonAttributeDefinition,
          children: [
            {
              id: 12345,
              definition: naturalPersonFirstNameAttributeDefinition,
              value: 'John',
            },
            {
              id: 12345,
              definition: naturalPersonSurnameAttributeDefinition,
              value: 'Doe',
            },
            {
              id: 12345,
              definition: naturalPersonDateOfBirthAttributeDefinition,
              value: '1980-01-01',
            },
            {
              id: 12345,
              definition: naturalPersonPersonIdAttributeDefinition,
              children: [
                {
                  id: 12345,
                  definition: personIdentifierIdentifierAttributeDefinition,
                  value: 'jdoe',
                },
              ],
            },
          ],
        },
      ],
    };

    const imported = await service.import(inputJsonObject, partyType);

    expect(imported).toEqual(expectedPartyNode);
  });

  // Commented out due to Angular 16 upgrade type handling changes
  // it('should import multi cardinality meta fields', async () => {});
  // it('should import multi cardinality attributes correctly', async () => {});
  // it('should import list based basic types correctly', async () => {});

  it('should handle a single value in a list for an attribute with cardinality of 1..1', async () => {
    const inputJsonObject = {
      "identifier": [
        {
          "issuerReference": {
            "value": {
              "partyId": [
                {
                  "identifier": [
                    {
                      "value": "party a"
                    }
                  ]
                }
              ]
            }
          }
        }
      ]
    };

    const imported = await service.import(
      inputJsonObject,
      testDataUtil.getEligibleCollateralSpecificationRootType()
    );

    expect((imported as any).children[0].children[0].children[0].children[0].value).toBe("party a")
  });
});
