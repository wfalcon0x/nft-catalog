import path from 'path';
import {
  emulator,
  init,
  shallPass,
  shallResolve,
  getAccountAddress,
  shallRevert
} from 'flow-js-testing';
import {
  deployNFTCatalog,
  addToCatalogAdmin,
  getNFTMetadataForCollectionName,
  setupNFTCatalogAdminProxy,
  sendAdminProxyCapability,
  addToCatalog,
  proposeNFTToCatalog,
  getNFTProposalForID,
  approveNFTProposal,
  rejectNFTProposal,
  removeNFTProposal,
  withdrawNFTProposalFromCatalog,
  getNFTCollectionsForNFTType,
  removeFromNFTCatalog,
  updateNFTCatalogEntry
} from '../src/nftcatalog';
import {
  deployExampleNFT,
  getExampleNFTType,
  mintExampleNFT,
  setupExampleNFTCollection
} from '../src/examplenft';
import { TIMEOUT } from '../src/common';

const TEST_NFT_NAME = 'Test Name';
const TEST_NFT_DESCRIPTION = 'Test Description';
const TEST_NFT_THUMBNAIL = 'https://flow.com/';

jest.setTimeout(TIMEOUT);

describe('NFT Catalog Test Suite', () => {
  beforeEach(async () => {
    const basePath = path.resolve(__dirname, '../../');
    const port = 7002;
    await init(basePath, { port });
    await emulator.start(port, false);
    return new Promise((resolve) => setTimeout(resolve, 1000));
  });

  // Stop emulator, so it could be restarted
  afterEach(async () => {
    await emulator.stop();
    return new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('should deploy NFTCatalog contract', async () => {
    await shallPass(deployNFTCatalog());
  });

  it('main admin should add to catalog', async () => {
    await deployNFTCatalog();

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    const Alice = await getAccountAddress('Alice');
    await setupExampleNFTCollection(Alice);
    await shallPass(mintExampleNFT(Alice, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));


    await shallPass(addToCatalogAdmin(
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection',
    ));

    let [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).not.toBe(null);
    expect(result.contractName).toBe(nftCreationEvent.data.contract);
    expect(error).toBe(null);
  });

  it('should add to catalog with two collections in a single type', async () => {
    await deployNFTCatalog();

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    const Alice = await getAccountAddress('Alice');
    await setupExampleNFTCollection(Alice);
    await shallPass(mintExampleNFT(Alice, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));


    await shallPass(addToCatalogAdmin(
      'ExampleNFT1',
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection',
    ));

    await shallRevert(addToCatalogAdmin(
      'ExampleNFT1',
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection',
    ));

    await shallPass(addToCatalogAdmin(
      'ExampleNFT2',
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection',
    ));

    let [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(Object.keys(result).length).toBe(2);
    expect(result['ExampleNFT1']).not.toBe(null);
    expect(result['ExampleNFT2']).not.toBe(null);
    expect(error).toBe(null);
  });

  it('should remove from catalog', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Alice);
    await shallPass(mintExampleNFT(Alice, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(addToCatalog(
      Alice,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    await shallPass(removeFromNFTCatalog(
      Alice,
      nftCreationEvent.data.contract
    ));

    let [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);

    await shallPass(addToCatalog(
      Alice,
      'ExampleNFT1',
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    await shallPass(addToCatalog(
      Alice,
      'ExampleNFT2',
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    await shallPass(removeFromNFTCatalog(
      Alice,
      'ExampleNFT1'
    ));

    [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(Object.keys(result).length).toBe(1);
    expect(result['ExampleNFT2']).not.toBe(null);


    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT1'));
    expect(result).toBe(null);

    await shallPass(removeFromNFTCatalog(
      Alice,
      'ExampleNFT2'
    ));

    [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(result).toBe(null);


    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT1'));
    expect(result).toBe(null);
  });

  it('should update catalog', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Alice);
    await shallPass(mintExampleNFT(Alice, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(addToCatalog(
      Alice,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));


    await shallPass(updateNFTCatalogEntry(
      Alice,
      nftCreationEvent.data.contract,
      'ExampleNFT2',
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    let [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(Object.keys(result).length).toBe(1);
    expect(result[nftCreationEvent.data.contract]).not.toBe(null);

    [result, error] = await shallResolve(getNFTMetadataForCollectionName(nftCreationEvent.data.contract));
    expect(result.contractName).toBe('ExampleNFT2');

    const tempNewIdentifer = nftTypeIdentifier.replace('.NFT', '.Collection'); // hacky way to test another type

    await shallPass(updateNFTCatalogEntry(
      Alice,
      nftCreationEvent.data.contract,
      'ExampleNFT2',
      nftCreationEvent.data.address,
      tempNewIdentifer,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    [result, error] = await shallResolve(getNFTCollectionsForNFTType(nftTypeIdentifier));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTCollectionsForNFTType(tempNewIdentifer));
    expect(Object.keys(result).length).toBe(1);
    expect(result[nftCreationEvent.data.contract]).not.toBe(null);

    [result, error] = await shallResolve(getNFTMetadataForCollectionName(nftCreationEvent.data.contract));
    expect(result.contractName).toBe('ExampleNFT2');
    expect(result.nftType.typeID).toBe(tempNewIdentifer);
  });

  it('non-admin accounts should be able to receive admin capability', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));
  });

  it('non-admin accounts with proxies should be able to add NFT to catalog', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Alice);
    await shallPass(mintExampleNFT(Alice, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(addToCatalog(
      Alice,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Alice,
      0,
      'exampleNFTCollection'
    ));

    let [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).not.toBe(null);
    expect(result.contractName).toBe(nftCreationEvent.data.contract);
    expect(error).toBe(null);
  });

  it('should be able to approve proposals', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const Bob = await getAccountAddress('Bob');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Bob);
    await shallPass(mintExampleNFT(Bob, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(proposeNFTToCatalog(
      Bob,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Bob,
      0,
      'exampleNFTCollection',
      'Please add my NFT to the Catalog'
    ));

    let [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("IN_REVIEW");
    expect(result.collectionName).toBe(nftCreationEvent.data.contract);

    await shallPass(approveNFTProposal(Alice, 1));

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("APPROVED");

    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).not.toBe(null);
    expect(result.contractName).toBe(nftCreationEvent.data.contract);
    expect(error).toBe(null);
  });

  it('should be able to reject proposals', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const Bob = await getAccountAddress('Bob');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Bob);
    await shallPass(mintExampleNFT(Bob, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(proposeNFTToCatalog(
      Bob,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Bob,
      0,
      'exampleNFTCollection',
      'Please add my NFT to the Catalog'
    ));

    let [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("IN_REVIEW");
    expect(result.collectionName).toBe(nftCreationEvent.data.contract);

    await shallPass(rejectNFTProposal(Alice, 1));

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("REJECTED");

    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);
  });

  it('should be able to remove proposals', async () => {
    await deployNFTCatalog();

    const Alice = await getAccountAddress('Alice');

    await shallResolve(setupNFTCatalogAdminProxy(Alice));

    await shallResolve(sendAdminProxyCapability(Alice));

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const Bob = await getAccountAddress('Bob');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Bob);
    await shallPass(mintExampleNFT(Bob, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(proposeNFTToCatalog(
      Bob,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Bob,
      0,
      'exampleNFTCollection',
      'Please add my NFT to the Catalog'
    ));

    let [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("IN_REVIEW");
    expect(result.collectionName).toBe(nftCreationEvent.data.contract);

    await shallPass(removeNFTProposal(Alice, 1));

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result).toBe(null);

    [result, error] = await shallResolve(getNFTMetadataForCollectionName('ExampleNFT'));
    expect(result).toBe(null);
  });

  it('should be able to withdraw proposals', async () => {
    await deployNFTCatalog();

    let res = await deployExampleNFT();
    const nftCreationEvent = res[0].events.find(element => element.type === 'flow.AccountContractAdded');

    const Bob = await getAccountAddress('Bob');

    const [nftTypeIdentifier, _] = await getExampleNFTType();

    await setupExampleNFTCollection(Bob);
    await shallPass(mintExampleNFT(Bob, TEST_NFT_NAME, TEST_NFT_DESCRIPTION, TEST_NFT_THUMBNAIL, [], [], []));

    await shallPass(proposeNFTToCatalog(
      Bob,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.contract,
      nftCreationEvent.data.address,
      nftTypeIdentifier,
      Bob,
      0,
      'exampleNFTCollection',
      'Please add my NFT to the Catalog'
    ));

    let [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result.status).toBe("IN_REVIEW");
    expect(result.collectionName).toBe(nftCreationEvent.data.contract);

    const Alice = await getAccountAddress('Alice');
    await shallRevert(withdrawNFTProposalFromCatalog(Alice, 1));

    await shallPass(withdrawNFTProposalFromCatalog(Bob, 1));

    [result, error] = await shallResolve(getNFTProposalForID(1));
    expect(result).toBe(null);
  });

});