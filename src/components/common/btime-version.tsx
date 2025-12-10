export default function BTimeVersionNumber() {
  // create-react-app injects the package,json version into this env var
  return <p>v{process.env.npm_package_version ?? "0.0"}</p>;
}
