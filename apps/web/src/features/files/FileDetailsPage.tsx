import { useParams } from "react-router-dom";
import { FileDetailsPanel } from "./FileDetailsPanel";

export default function FileDetailsPage() {
  const params = useParams();
  const fileId = Number(params.id);
  if (!fileId) return null;
  return <FileDetailsPanel fileId={fileId} variant="page" />;
}
