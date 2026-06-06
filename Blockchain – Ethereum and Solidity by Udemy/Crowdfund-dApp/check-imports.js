import toolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

if (typeof toolboxViem.dependencies === 'function') {
    console.log("toolboxViem dependencies result:", toolboxViem.dependencies());
} else {
    console.log("toolboxViem dependencies:", toolboxViem.dependencies);
}
