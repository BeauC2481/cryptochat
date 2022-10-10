require('@nomiclabs/hardhat-ethers');

module.exports = {
  solidity: '0.8.0',
  defaultNetwork: 'goerli',
  networks: {
    hardhat: {},
    goerli: {
      url: 'https://eth-goerli.g.alchemy.com/v2/PQ5bzKf5-WjUopU77xYejg8j8jXs5VJ3',
      accounts: ['0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd'],
    },
  },
};

