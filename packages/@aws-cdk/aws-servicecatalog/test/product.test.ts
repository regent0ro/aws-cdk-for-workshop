import * as path from 'path';
import { Match, Template } from '@aws-cdk/assertions';
import * as sns from '@aws-cdk/aws-sns';
import * as cdk from '@aws-cdk/core';
import * as servicecatalog from '../lib';

/* eslint-disable quote-props */
describe('Product', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'Stack', {
      synthesizer: new cdk.LegacyStackSynthesizer(),
    });
  });

  test('default product test', () => {
    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template'),
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      Name: 'testProduct',
      Owner: 'testOwner',
      ProvisioningArtifactParameters: [
        {
          'DisableTemplateValidation': false,
          'Info': {
            'LoadTemplateFromURL': 'https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template',
          },
        },
      ],
    });
  }),

  test('default product test with validation disabled', () => {
    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template'),
          validateTemplate: false,
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      Name: 'testProduct',
      Owner: 'testOwner',
      ProvisioningArtifactParameters: [
        {
          'DisableTemplateValidation': true,
          'Info': {
            'LoadTemplateFromURL': 'https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template',
          },
        },
      ],
    });
  }),

  test('product test from Asset', () => {
    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product1.template.json')),
        },
      ],
    });

    const assembly = app.synth();
    const synthesized = assembly.stacks[0];
    expect(synthesized.assets.length).toEqual(1);
  }),

  test('multiple product versions from Assets', () => {
    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product1.template.json')),
        },
        {
          productVersionName: 'v2',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product2.template.json')),
        },
      ],
    });

    const assembly = app.synth();
    const synthesized = assembly.stacks[0];
    expect(synthesized.assets.length).toEqual(2);
  }),

  test('product test from product stack', () => {
    const productStack = new servicecatalog.ProductStack(stack, 'ProductStack');

    new sns.Topic(productStack, 'SNSTopicProductStack');

    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(productStack),
        },
      ],
    });

    const assembly = app.synth();
    expect(assembly.artifacts.length).toEqual(2);
    expect(assembly.stacks[0].assets.length).toBe(1);
    expect(assembly.stacks[0].assets[0].path).toEqual('StackProductStack190B56DE.product.template.json');
  }),

  test('multiple product versions from product stack', () => {
    const productStackVersion1 = new servicecatalog.ProductStack(stack, 'ProductStackV1');
    const productStackVersion2 = new servicecatalog.ProductStack(stack, 'ProductStackV2');

    new sns.Topic(productStackVersion1, 'SNSTopicProductStack1');

    new sns.Topic(productStackVersion2, 'SNSTopicProductStack2', {
      displayName: 'a test',
    });

    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(productStackVersion1),
        },
        {
          productVersionName: 'v2',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(productStackVersion2),
        },
      ],
    });

    const assembly = app.synth();

    expect(assembly.stacks[0].assets.length).toBe(2);
    expect(assembly.stacks[0].assets[0].path).toEqual('StackProductStackV111F65963.product.template.json');
    expect(assembly.stacks[0].assets[1].path).toEqual('StackProductStackV24832700A.product.template.json');
  }),

  test('identical product versions from product stack creates one asset', () => {
    class TestProductStack extends servicecatalog.ProductStack {
      constructor(scope: any, id: string) {
        super(scope, id);

        new sns.Topic(this, 'TopicProduct');
      }
    }

    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestProductStack(stack, 'v1')),
        },
        {
          productVersionName: 'v2',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestProductStack(stack, 'v2')),
        },
        {
          productVersionName: 'v3',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestProductStack(stack, 'v3')),
        },
      ],
    });

    const assembly = app.synth();

    expect(assembly.stacks[0].assets.length).toBe(1);
  }),

  test('product test from multiple sources', () => {
    new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
      productName: 'testProduct',
      owner: 'testOwner',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template'),
        },
        {
          productVersionName: 'v2',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment-v2.template'),
        },
        {
          productVersionName: 'v3',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product1.template.json')),
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      Name: 'testProduct',
      Owner: 'testOwner',
      ProvisioningArtifactParameters: Match.arrayWith([
        Match.objectLike({
          'Info': {
            'LoadTemplateFromURL': 'https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template',
          },
        }),
      ]),
    });
  }),

  test('product from attributes', () => {
    const product = servicecatalog.Product.fromProductArn(stack, 'MyProduct', 'arn:aws:catalog:region:account-id:product/prod-djh8932wr');

    expect(product.productArn).toEqual('arn:aws:catalog:region:account-id:product/prod-djh8932wr');
  }),

  test('fails product from attributes without resource name in arn', () => {
    expect(() => {
      servicecatalog.Product.fromProductArn(stack, 'MyProduct', 'arn:aws:catalog:region:account-id:product');
    }).toThrowError('Missing required Portfolio ID from Portfolio ARN: arn:aws:catalog:region:account-id:product');
  }),

  test('fails product creation with invalid email', () => {
    expect(() => {
      new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
        productName: 'testProduct',
        owner: 'testOwner',
        productVersions: [
          {
            cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template'),
          },
        ],
        supportEmail: 'invalid email',
      });
    }).toThrowError(/Invalid support email for resource Stack\/MyProduct/);
  }),

  test('fails product creation with invalid url', () => {
    expect(() => {
      new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
        productName: 'testProduct',
        owner: 'testOwner',
        productVersions: [
          {
            cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl('invalid url'),
          },
        ],
      });
    }).toThrowError(/Invalid provisioning template url for resource Stack\/MyProduct/);
  }),

  test('fails product creation with empty productVersions', () => {
    expect(() => {
      new servicecatalog.CloudFormationProduct(stack, 'MyProduct', {
        productName: 'testProduct',
        owner: 'testOwner',
        productVersions: [],
      });
    }).toThrowError(/Invalid product versions for resource Stack\/MyProduct/);
  });
});