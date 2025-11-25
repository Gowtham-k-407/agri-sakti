// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgriContract {
    uint256 public constant DEPOSIT_PERCENT = 50; // 50% upfront
    uint256 public constant FULL_PERCENT = 100;

    struct Listing {
        address payable farmer;
        string cropName;
        uint256 quantityKg;
        uint256 pricePerKg; // in wei per kg
        bool locked;
        bool active;
    }

    struct Deal {
        uint256 listingId;
        address payable buyer;
        uint256 totalAmount;
        uint256 depositAmount;
        uint256 remainingAmount;
        bool depositPaid;
        bool completed;
        bool cancelled;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Deal) public deals;

    uint256 public listingCount;
    uint256 public dealCount;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed farmer,
        string cropName,
        uint256 quantityKg,
        uint256 pricePerKg
    );

    event ListingDeactivated(uint256 indexed listingId);

    event DealCreated(
        uint256 indexed dealId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 totalAmount,
        uint256 depositAmount,
        uint256 remainingAmount
    );

    event DepositPaid(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event FinalPaymentMade(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event DealCompleted(uint256 indexed dealId, uint256 listingId, address farmer, uint256 totalPaid);
    event DealCancelled(uint256 indexed dealId, uint256 listingId, address buyer, uint256 refunded);

    modifier onlyFarmer(uint256 listingId) {
        require(msg.sender == listings[listingId].farmer, "Not listing farmer");
        _;
    }

    modifier onlyBuyer(uint256 dealId) {
        require(msg.sender == deals[dealId].buyer, "Not deal buyer");
        _;
    }

    /* LISTINGS */

    function createListing(
        string memory cropName,
        uint256 quantityKg,
        uint256 pricePerKg
    ) external {
        require(quantityKg > 0, "Quantity must be > 0");
        require(pricePerKg > 0, "Price must be > 0");

        listings[listingCount] = Listing({
            farmer: payable(msg.sender),
            cropName: cropName,
            quantityKg: quantityKg,
            pricePerKg: pricePerKg,
            locked: false,
            active: true
        });

        emit ListingCreated(listingCount, msg.sender, cropName, quantityKg, pricePerKg);
        listingCount++;
    }

    function deactivateListing(uint256 listingId) external onlyFarmer(listingId) {
        Listing storage l = listings[listingId];
        require(l.active, "Already inactive");
        require(!l.locked, "Listing locked by a deal");
        l.active = false;

        emit ListingDeactivated(listingId);
    }

    /* DEAL FLOW – 50% deposit, 50% on delivery */

    function createDeal(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Listing inactive");
        require(!l.locked, "Listing already locked");

        uint256 totalAmount = l.quantityKg * l.pricePerKg;
        uint256 requiredDeposit = (totalAmount * DEPOSIT_PERCENT) / FULL_PERCENT;
        require(msg.value == requiredDeposit, "Incorrect deposit amount");

        l.locked = true;

        deals[dealCount] = Deal({
            listingId: listingId,
            buyer: payable(msg.sender),
            totalAmount: totalAmount,
            depositAmount: requiredDeposit,
            remainingAmount: totalAmount - requiredDeposit,
            depositPaid: true,
            completed: false,
            cancelled: false
        });

        emit DealCreated(
            dealCount,
            listingId,
            msg.sender,
            totalAmount,
            requiredDeposit,
            totalAmount - requiredDeposit
        );

        emit DepositPaid(dealCount, msg.sender, requiredDeposit);

        dealCount++;
    }

    function payRemaining(uint256 dealId) external payable onlyBuyer(dealId) {
      Deal storage d = deals[dealId];
      Listing storage l = listings[d.listingId];

      require(!d.completed, "Deal already completed");
      require(!d.cancelled, "Deal cancelled");
      require(d.depositPaid, "Deposit not paid");
      require(msg.value == d.remainingAmount, "Incorrect remaining amount");

      emit FinalPaymentMade(dealId, msg.sender, msg.value);

      uint256 payout = d.totalAmount;

      d.completed = true;
      l.active = false;
      l.locked = true;

      l.farmer.transfer(payout);

      emit DealCompleted(dealId, d.listingId, l.farmer, payout);
    }

    function cancelDeal(uint256 dealId) external {
        Deal storage d = deals[dealId];
        Listing storage l = listings[d.listingId];

        require(!d.completed, "Deal already completed");
        require(!d.cancelled, "Deal already cancelled");
        require(d.depositPaid, "No deposit");

        require(
            msg.sender == d.buyer || msg.sender == l.farmer,
            "Only buyer or farmer can cancel"
        );

        d.cancelled = true;
        l.locked = false;

        uint256 refund = d.depositAmount;
        d.depositAmount = 0;
        d.remainingAmount = 0;

        d.buyer.transfer(refund);

        emit DealCancelled(dealId, d.listingId, d.buyer, refund);
    }

    /* VIEW HELPERS */

    function getListing(uint256 listingId)
        external
        view
        returns (
            address farmer,
            string memory cropName,
            uint256 quantityKg,
            uint256 pricePerKg,
            bool locked,
            bool active
        )
    {
        Listing storage l = listings[listingId];
        return (l.farmer, l.cropName, l.quantityKg, l.pricePerKg, l.locked, l.active);
    }

    function getDeal(uint256 dealId)
        external
        view
        returns (
            uint256 listingId,
            address buyer,
            uint256 totalAmount,
            uint256 depositAmount,
            uint256 remainingAmount,
            bool depositPaid,
            bool completed,
            bool cancelled
        )
    {
        Deal storage d = deals[dealId];
        return (
            d.listingId,
            d.buyer,
            d.totalAmount,
            d.depositAmount,
            d.remainingAmount,
            d.depositPaid,
            d.completed,
            d.cancelled
        );
    }
}
