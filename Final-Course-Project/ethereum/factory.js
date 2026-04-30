import web3 from "./web3";
import CampaignFactory from "./build/CampaignFactory.json";

export const getFactoryAddress = () =>
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS || process.env.FACTORY_ADDRESS;

export const getFactory = () => {
  const address = getFactoryAddress();
  if (!address) return null;
  return new web3.eth.Contract(CampaignFactory.abi, address);
};

export default getFactory();
