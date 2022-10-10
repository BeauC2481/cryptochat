const fs = require('fs');
const hre = require('hardhat');

async function main() {
  const Decentratwitter = await hre.ethers.getContractFactory('Decentratwitter');
  const decentratwitter = await Decentratwitter.deploy();

  await decentratwitter.deployed();

  const contractsDir = __dirname + "/../pages/contractsData";
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + `/decentratwitter-address.json`,
    JSON.stringify({ address: decentratwitter.address }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync("Decentratwitter");

  fs.writeFileSync(
    contractsDir + `/decentratwitter.json`,
    JSON.stringify(contractArtifact, null, 2)
  );

  console.log('Decentratwitter deployed to:', decentratwitter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

