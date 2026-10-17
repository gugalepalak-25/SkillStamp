// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SkillStampRegistry
/// @notice Non-transferable credential registry. Stores compact hashes only; no personal data.
contract SkillStampRegistry is Ownable {
    enum Category { Academic, Technical, Leadership, Community }
    enum AchievementType {
        Workshop, Hackathon, Internship, Project,
        OpenSource, Volunteering, Mentoring, EventOrganization
    }

    struct Credential {
        uint256 id;
        address recipient;
        address issuer;
        string title;
        AchievementType achievementType;
        Category category;
        bytes32 descriptionHash; // SHA-256 of the description (kept off-chain)
        bytes32 evidenceHash;    // SHA-256 of evidence file / canonical text
        string skills;           // comma-separated, short
        uint32 points;
        uint64 issuedAt;
        bool revoked;
        uint64 revokedAt;
        address revokedBy;
    }

    uint32 public constant MAX_POINTS = 100;
    uint256 public constant MAX_TITLE_BYTES = 80;
    uint256 public constant MAX_SKILLS_BYTES = 120;

    error NotIssuer();
    error NotAuthorizedToRevoke();
    error InvalidRecipient();
    error InvalidIssuer();
    error EmptyTitle();
    error TitleTooLong();
    error SkillsTooLong();
    error InvalidAchievementType();
    error InvalidCategory();
    error InvalidPoints();
    error EmptyEvidenceHash();
    error CredentialNotFound();
    error AlreadyRevoked();
    error RenounceDisabled();

    event IssuerUpdated(address indexed issuer, bool authorized);
    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed recipient,
        address indexed issuer,
        uint32 points
    );
    event CredentialRevoked(uint256 indexed credentialId, address indexed revokedBy);

    uint256 public totalCredentials;
    mapping(address => bool) private _authorizedIssuers;
    mapping(uint256 => Credential) private _credentials;
    mapping(address => uint256[]) private _byRecipient;
    mapping(address => uint256[]) private _byIssuer;
    mapping(address => uint256) public activePoints;
    mapping(address => uint256) public activeCount;
    address[] private _recipients;
    mapping(address => bool) private _knownRecipient;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        if (issuer == address(0)) revert InvalidIssuer();
        _authorizedIssuers[issuer] = authorized;
        emit IssuerUpdated(issuer, authorized);
    }

    function isIssuer(address account) public view returns (bool) {
        return account == owner() || _authorizedIssuers[account];
    }

    function issueCredential(
        address recipient,
        string calldata title,
        uint8 achievementType,
        uint8 category,
        bytes32 descriptionHash,
        bytes32 evidenceHash,
        string calldata skills,
        uint32 points
    ) external returns (uint256 id) {
        if (!isIssuer(msg.sender)) revert NotIssuer();
        if (recipient == address(0)) revert InvalidRecipient();
        uint256 tl = bytes(title).length;
        if (tl == 0) revert EmptyTitle();
        if (tl > MAX_TITLE_BYTES) revert TitleTooLong();
        if (bytes(skills).length > MAX_SKILLS_BYTES) revert SkillsTooLong();
        if (achievementType > uint8(AchievementType.EventOrganization)) revert InvalidAchievementType();
        if (category > uint8(Category.Community)) revert InvalidCategory();
        if (points == 0 || points > MAX_POINTS) revert InvalidPoints();
        if (evidenceHash == bytes32(0)) revert EmptyEvidenceHash();

        id = ++totalCredentials;
        _credentials[id] = Credential({
            id: id,
            recipient: recipient,
            issuer: msg.sender,
            title: title,
            achievementType: AchievementType(achievementType),
            category: Category(category),
            descriptionHash: descriptionHash,
            evidenceHash: evidenceHash,
            skills: skills,
            points: points,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            revokedAt: 0,
            revokedBy: address(0)
        });
        _byRecipient[recipient].push(id);
        _byIssuer[msg.sender].push(id);
        activePoints[recipient] += points;
        activeCount[recipient] += 1;
        if (!_knownRecipient[recipient]) {
            _knownRecipient[recipient] = true;
            _recipients.push(recipient);
        }
        emit CredentialIssued(id, recipient, msg.sender, points);
    }

    /// @notice Owner, or the original issuer while still authorized, may revoke.
    function revokeCredential(uint256 id) external {
        Credential storage c = _credentials[id];
        if (c.id == 0) revert CredentialNotFound();
        if (c.revoked) revert AlreadyRevoked();
        bool allowed = msg.sender == owner() ||
            (msg.sender == c.issuer && _authorizedIssuers[msg.sender]);
        if (!allowed) revert NotAuthorizedToRevoke();

        c.revoked = true;
        c.revokedAt = uint64(block.timestamp);
        c.revokedBy = msg.sender;
        activePoints[c.recipient] -= c.points;
        activeCount[c.recipient] -= 1;
        emit CredentialRevoked(id, msg.sender);
    }

    function getCredential(uint256 id) external view returns (Credential memory) {
        if (_credentials[id].id == 0) revert CredentialNotFound();
        return _credentials[id];
    }

    function isValid(uint256 id) external view returns (bool) {
        Credential storage c = _credentials[id];
        return c.id != 0 && !c.revoked;
    }

    function getCredentialIdsByRecipient(address r) external view returns (uint256[] memory) {
        return _byRecipient[r];
    }

    function getCredentialIdsByIssuer(address i) external view returns (uint256[] memory) {
        return _byIssuer[i];
    }

    function recipientCount() external view returns (uint256) {
        return _recipients.length;
    }

    /// @notice Paged read to avoid unbounded loops.
    function getRecipients(uint256 offset, uint256 limit) external view returns (address[] memory out) {
        uint256 n = _recipients.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit > n ? n : offset + limit;
        out = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = _recipients[i];
    }
}
