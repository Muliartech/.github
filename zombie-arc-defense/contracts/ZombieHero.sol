// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ZombieHero
 * @notice Hero NFTs that the player deploys on the battlefield.
 *         Each hero has a tier (1-3) which determines damage/fire-rate.
 *         Players can mint a free starter hero once, and buy more with USDC.
 *
 * @dev Arc Testnet uses USDC as the native gas token, but USDC is *also* an
 *      ERC-20 contract you can pull via transferFrom for paid mints.
 */
contract ZombieHero is ERC721Enumerable, Ownable {
    /// USDC token used for paid mints (testnet USDC address on Arc).
    IERC20 public immutable usdc;

    /// Treasury that receives USDC from paid mints.
    address public treasury;

    /// Price (in USDC base units, 6 decimals on most USDC, 18 on Arc-native)
    /// We use 6 decimals to match standard USDC; adjust if your testnet differs.
    uint256 public constant PRICE_TIER_1 = 1_000_000;   // 1 USDC
    uint256 public constant PRICE_TIER_2 = 5_000_000;   // 5 USDC
    uint256 public constant PRICE_TIER_3 = 20_000_000;  // 20 USDC

    /// tokenId -> tier (1, 2, or 3)
    mapping(uint256 => uint8) public tierOf;

    /// Has this address claimed the free starter?
    mapping(address => bool) public claimedStarter;

    uint256 private _nextTokenId = 1;

    string private _baseTokenURI;

    event HeroMinted(address indexed to, uint256 indexed tokenId, uint8 tier, bool free);

    constructor(address initialOwner, address usdc_, address treasury_, string memory baseURI_)
        ERC721("ZombieHero", "ZHERO")
        Ownable(initialOwner)
    {
        require(usdc_ != address(0), "usdc=0");
        require(treasury_ != address(0), "treasury=0");
        usdc = IERC20(usdc_);
        treasury = treasury_;
        _baseTokenURI = baseURI_;
    }

    // -------- Minting --------

    /// One free starter hero (tier 1) per address.
    function claimStarter() external returns (uint256 tokenId) {
        require(!claimedStarter[msg.sender], "already claimed");
        claimedStarter[msg.sender] = true;
        tokenId = _mintHero(msg.sender, 1);
        emit HeroMinted(msg.sender, tokenId, 1, true);
    }

    /// Paid mint. Pull USDC from caller and assign requested tier.
    function buyHero(uint8 tier) external returns (uint256 tokenId) {
        uint256 price = _priceFor(tier);
        require(usdc.transferFrom(msg.sender, treasury, price), "USDC transfer failed");
        tokenId = _mintHero(msg.sender, tier);
        emit HeroMinted(msg.sender, tokenId, tier, false);
    }

    function _priceFor(uint8 tier) internal pure returns (uint256) {
        if (tier == 1) return PRICE_TIER_1;
        if (tier == 2) return PRICE_TIER_2;
        if (tier == 3) return PRICE_TIER_3;
        revert("invalid tier");
    }

    function _mintHero(address to, uint8 tier) internal returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        tierOf[tokenId] = tier;
        _safeMint(to, tokenId);
    }

    // -------- Read helpers --------

    /// Returns all hero tokenIds owned by an address with their tiers.
    function heroesOf(address player)
        external
        view
        returns (uint256[] memory ids, uint8[] memory tiers)
    {
        uint256 n = balanceOf(player);
        ids = new uint256[](n);
        tiers = new uint8[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = tokenOfOwnerByIndex(player, i);
            ids[i] = id;
            tiers[i] = tierOf[id];
        }
    }

    // -------- Admin --------

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury=0");
        treasury = t;
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
