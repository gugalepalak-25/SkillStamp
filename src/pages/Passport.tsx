import { useParams } from "react-router-dom";
import { isAddress } from "ethers";
import PassportView from "../components/PassportView";
import { Notice } from "../components/ui";

export default function Passport() {
  const { address = "" } = useParams();
  if (!isAddress(address)) return <Notice kind="error">That is not a valid wallet address.</Notice>;
  return <PassportView address={address} />;
}
