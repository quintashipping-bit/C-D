import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Settings() {
  const cards = [
    {
      title: "Australia",
      path: "/settings/australia",
      description: "Manage Australia delivery rates and clearance fees"
    },

    {
      title: "South Africa",
      path: "/settings/south-africa",
      description: "Manage South Africa zones and KG pricing"
    },

    {
      title: "Qatar",
      path: "/settings/qatar",
      description: "Manage Qatar customs and legal fees"
    },

    {
      title: "Saudi Arabia",
      path: "/settings/saudi",
      description: "Manage Saudi duty and clearance settings"
    },

    {
      title: "Singapore",
      path: "/settings/singapore",
      description: "Manage Singapore air and sea charges"
    },

    {
      title: "Exchange Rates",
      path: "/settings/exchange-rates",
      description: "Manage currency exchange rates"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold text-fuchsia-500 mb-8">
          Settings
        </h1>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {cards.map(card => (
            <Link
              key={card.path}
              to={card.path}
              className="
                bg-zinc-900
                hover:bg-zinc-800
                transition
                rounded-2xl
                p-6
                border border-zinc-800
              "
            >
              <h2 className="text-xl font-bold mb-3">
                {card.title}
              </h2>

              <p className="text-zinc-400 text-sm">
                {card.description}
              </p>
            </Link>
          ))}

        </div>
      </div>
    </div>
  );
}
