import Link from "next/link";

export default function HomeHeaderContent() {
    return (
        <Link href="/">
            <h1 className="grow font-bold text-center text-2xl py-3">BTime</h1>
        </Link>
    );
}
  