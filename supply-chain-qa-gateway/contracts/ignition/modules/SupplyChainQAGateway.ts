import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SupplyChainQAGatewayModule = buildModule(
  "SupplyChainQAGatewayModule",
  (m) => {
    const initialAdmin = m.getAccount(0);

    const gateway = m.contract("SupplyChainQAGateway", [initialAdmin]);

    return { gateway };
  }
);

export default SupplyChainQAGatewayModule;