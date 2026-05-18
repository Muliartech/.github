// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZombieCoin (ZMB)
 * @notice In-game reward token. Players earn ZMB by surviving waves.
 *         Only the ZombieGame contract is allowed to mint new ZMB once
 *         ownership is transferred to it after deployment.
 */
contract ZombieCoin is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("ZombieCoin", "ZMB")
        Ownable(initialOwner)
    {}

    /// @notice Mint reward tokens to a player. Restricted to the owner
    ///         (which after setup will be the ZombieGame contract).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
