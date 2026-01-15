export default function BTimeVersionNumber() {
  // create-react-app injects the package,json version into this env var
  // unfortunately this tracks the frontend package.json but that's ok
  return <p>v{APP_VERSION ?? "0.1.0"}</p>;
}
