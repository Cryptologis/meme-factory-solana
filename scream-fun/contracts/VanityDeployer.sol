// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BondingCurve.sol";
import "./ScreamFactory.sol";

/**
 * @title VanityDeployer
 * @notice Helper contract to deploy ScreamFactory with vanity address using CREATE2
 * @dev Use off-chain script to find salt that produces desired address suffix
 *
 * EXAMPLE: To get address ending in "5c7ea3" (looks like "scream" in leet speak):
 * 1. Run findVanitySalt.js script off-chain to find matching salt
 * 2. Deploy ScreamFactory using deployFactory() with that salt
 */
contract VanityDeployer {
    event FactoryDeployed(address indexed factory, bytes32 salt, string suffix);

    /**
     * @notice Deploy ScreamFactory with specific salt to get vanity address
     * @param salt The salt found by off-chain brute force search
     * @param devWallet Developer wallet address
     * @param rageFund RAGE fund address
     * @param uniswapFactory Uniswap factory address
     * @return factory The deployed factory address
     */
    function deployFactory(
        bytes32 salt,
        address devWallet,
        address rageFund,
        address uniswapFactory
    ) external returns (address factory) {
        // Deploy using CREATE2 for deterministic address
        ScreamFactory newFactory = new ScreamFactory{salt: salt}(
            devWallet,
            rageFund,
            uniswapFactory
        );

        factory = address(newFactory);

        // Extract last 6 characters for display
        string memory suffix = getAddressSuffix(factory);
        emit FactoryDeployed(factory, salt, suffix);

        return factory;
    }

    /**
     * @notice Predict what address will be deployed with given salt
     * @param salt The salt to test
     * @param deployer The address that will call deployFactory
     * @param devWallet Developer wallet (constructor param)
     * @param rageFund RAGE fund (constructor param)
     * @param uniswapFactory Uniswap factory (constructor param)
     * @return The predicted address
     */
    function predictAddress(
        bytes32 salt,
        address deployer,
        address devWallet,
        address rageFund,
        address uniswapFactory
    ) external view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(ScreamFactory).creationCode,
            abi.encode(devWallet, rageFund, uniswapFactory)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Get last 6 characters of address (suffix)
     */
    function getAddressSuffix(address addr) public pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(6);

        uint160 value = uint160(addr);
        for (uint i = 0; i < 6; i++) {
            str[5-i] = alphabet[value & 0xf];
            value = value >> 4;
        }

        return string(str);
    }

    /**
     * @notice Check if address ends with desired suffix
     * @param addr Address to check
     * @param desiredSuffix Hex string of desired ending (e.g., "5c7ea3" for scream-like)
     * @return True if address ends with desired suffix
     */
    function checkSuffix(address addr, bytes3 desiredSuffix) public pure returns (bool) {
        uint160 addrValue = uint160(addr);
        uint24 addrSuffix = uint24(addrValue & 0xFFFFFF); // Last 3 bytes (6 hex chars)
        return addrSuffix == uint24(desiredSuffix);
    }
}

/**
 * OFF-CHAIN USAGE (JavaScript with ethers.js):
 *
 * // Find salt that produces address ending in "5c7ea3" (scream-like)
 * const ethers = require('ethers');
 *
 * async function findVanitySalt(target = '5c7ea3') {
 *   const vanityDeployer = await ethers.getContractAt('VanityDeployer', deployerAddress);
 *   const deployer = await ethers.getSigner().getAddress();
 *   const targetBytes = '0x' + target;
 *
 *   console.log(`Searching for address ending in ${target}...`);
 *
 *   for (let i = 0; i < 1000000; i++) {
 *     const salt = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
 *     const predicted = await vanityDeployer.predictAddress(
 *       salt,
 *       deployer,
 *       devWallet,
 *       rageFund,
 *       uniswapFactory
 *     );
 *
 *     if (predicted.toLowerCase().endsWith(target.toLowerCase())) {
 *       console.log(`Found! Salt: ${salt}`);
 *       console.log(`Address: ${predicted}`);
 *       return salt;
 *     }
 *
 *     if (i % 10000 === 0) {
 *       console.log(`Tried ${i} salts...`);
 *     }
 *   }
 *
 *   console.log('No match found in first 1M attempts');
 *   return null;
 * }
 *
 * // Popular "scream" like suffixes in hex:
 * // - "5c7ea3" - closest to "scream"
 * // - "5c7ea0" - also scream-like
 * // - "dead00" - dead
 * // - "cafeba" - cafe/babe
 * // - "c0ffee" - coffee
 */
