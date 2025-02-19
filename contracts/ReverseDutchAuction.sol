// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ReverseDutchAuctionSwap{
    struct Swap{
        address sellToken;
        address buyToken;
        uint256 amount;
        uint256 initialPrice;
        uint256 finalPrice;
        uint256 decreaseRatePerSecond;
        uint256 duration;
        uint256 timeInitialized;
        uint256 timeFinalized;
        address seller;
        address buyer;
        bool active;
    }

    uint256 public swapCount;
    mapping(uint256 => Swap) public swaps;

    error insufficientFunds();
    error invalidAmount();
    error invalidSwap();
    error swapEnded();
    error swapFailed();
    error transferFailed();

    function initiateSwap(address _sellToken,
    address _buyToken,
    uint256 _amount,
    uint256 _initialPrice,
    uint256 _decreaseRatePerSecond,
    uint256 _duration) public {
        if(_amount < 1) revert invalidAmount();
        if(IERC20(_sellToken).balanceOf(msg.sender) < _amount) revert insufficientFunds();

        swapCount += 1;

        Swap memory newSwap = Swap(
            _sellToken,
            _buyToken,
            _amount,
            _initialPrice,
            0,
            _decreaseRatePerSecond,
            _duration,
            block.timestamp,
            0,
            msg.sender,
            address(0),
            true
        );
        swaps[swapCount] = newSwap;
    }

    function buySwap(uint256 _swapId) public {
        Swap memory swap = swaps[_swapId];
        if (swap.amount == 0) revert invalidSwap();
        if (!swap.active) revert swapEnded();
        if (IERC20(swap.sellToken).balanceOf(swap.seller) < swap.amount) revert swapFailed();
        if ((swap.duration + swap.timeInitialized) < block.timestamp) revert swapEnded();

        uint256 currentPrice = getCurrentSwapPrice(_swapId);
        if (IERC20(swap.buyToken).balanceOf(msg.sender)  < currentPrice) revert insufficientFunds();

        bool sellSuccess = IERC20(swap.sellToken).transferFrom(swap.seller, msg.sender, swap.amount);
        if(!sellSuccess) revert transferFailed();
        bool buySuccess = IERC20(swap.buyToken).transferFrom(msg.sender, swap.seller, currentPrice);
        if(!buySuccess) revert transferFailed();
        swaps[_swapId].active = false;
        swaps[_swapId].buyer = msg.sender;
        swaps[_swapId].finalPrice = currentPrice;
        swaps[_swapId].timeFinalized = block.timestamp;
    }

    function getCurrentSwapPrice(uint256 _swapId) public view returns(uint256){
        Swap memory swap = swaps[_swapId];
        if (!swap.active) revert swapEnded();
        if ((swap.duration + swap.timeInitialized) < block.timestamp) revert swapEnded();

        uint256 timeDifference = block.timestamp - swap.timeInitialized;
        uint256 priceDecrease = (timeDifference * swap.decreaseRatePerSecond) / 1e18;
        uint256 currentPrice = swap.initialPrice - priceDecrease;
        return currentPrice;
    }
}