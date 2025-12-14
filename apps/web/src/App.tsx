import { useRef, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { GitCommitIcon, TrophyIcon } from "@primer/octicons-react";
import type { GetWrappedType } from "@apps/api";
import { hc, type InferResponseType } from "hono/client";
import { toPng } from "html-to-image";

const URL = import.meta.env.PROD
  ? "https://api.rezha-bahari.workers.dev"
  : "http://localhost:8787";

const client = hc<GetWrappedType>(URL);

function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const $get = client.wrapped[":username"].$get;
  type ResType = InferResponseType<typeof $get, 200>;

  const [data, setData] = useState<ResType>();
  const [userName, setUserName] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  const handleGetWrapped = async () => {
    const res = await client.wrapped[":username"].$get({
      param: {
        username: userName,
      },
    });

    const data = await res.json();

    if ("error" in data) {
      console.error("Error fetching wrapped data:", data.error);
      return;
    }

    setData(data);
  };

  const handleExportImage = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `github-wrapped-${userName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error exporting image:", error);
    }
  };

  if (!data)
    return (
      <div>
        input your username{" "}
        <input
          className="border"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button
          onClick={handleGetWrapped}
          className="border hover:cursor-pointer"
        >
          get wrapped
        </button>
      </div>
    );

  return (
    <div className="p-8 place-items-center bg-gray-800 min-h-screen">
      <div
        ref={cardRef}
        className="rounded-xl w-[400px] bg-linear-to-t from-[#57D465] via-teal-800 to-black text-white py-8"
      >
        <h1 className="text-4xl font-bold text-center text-white">
          Github Wrapped 2025
        </h1>

        <div className="flex items-center justify-center gap-2 mt-4">
          <div>
            <img
              className="size-14 rounded-full"
              src={data.avatarUrl}
            />
          </div>
          <p>@{data.name}</p>
        </div>

        <ActivityCalendar
          data={data.contributionCalendar}
          theme={{
            light: ["hsl(0, 0%, 92%)", "rebeccapurple"],
            dark: ["#0D1117", "#57D465"],
          }}
          showWeekdayLabels
          style={{
            width: "350px",
          }}
          showTotalCount={false}
          showColorLegend={false}
        />

        <div className="px-8">
          <div className="pb-4 grid gap-2">
            <div className="bg-white text-black rounded-md flex items-center justify-center text-center gap-2">
              <GitCommitIcon size={64} />
              <p className="text-xl font-medium">
                {data.totalContributions} Total Commits
              </p>
            </div>
          </div>

          <div className="pb-4 grid grid-cols-1 gap-2">
            {/* <div className="h-20 border-2 rounded-md flex flex-col items-center justify-center gap-1">
            <StarIcon size={24} />
            <p className="font-medium">500 Total Stars</p>
          </div> */}
            <div className="bg-black h-20 rounded-md flex flex-col items-center justify-center gap-1">
              <TrophyIcon size={24} />
              <p className="font-medium">
                {data.streak.longest} Days Longest Commit Streak
              </p>
            </div>
          </div>

          {data.organizations.length > 0 && (
            <div>
              <p className="mb-1">Contributed to</p>
              <div
                className={`pb-4 gap-2 grid ${
                  data.organizations.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-3"
                }`}
              >
                {/* <div className="h-20 border-2 rounded-md flex flex-col items-center justify-center gap-1">
                    <StarIcon size={24} />
                    <p className="font-medium">500 Total Stars</p>
                  </div> */}
                {data.organizations.map((org) => (
                  <div
                    onClick={() => {
                      setData((d) => {
                        if (!d) return d;
                        return {
                          ...d,
                          organizations: d.organizations.filter(
                            (o) => o.login !== org.login
                          ),
                        };
                      });
                    }}
                    title="click to remove"
                    className="hover:cursor-pointer h-20 bg-white text-black rounded-md flex flex-col items-center justify-center gap-1"
                  >
                    <img
                      className="size-8 rounded-full"
                      src={org.avatarUrl}
                    />
                    <p className="truncate w-16 text-center font-medium">
                      {org.login}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-center mb-1">Top Languages</p>
            <div className="pb-4 grid grid-cols-3 gap-2 items-end">
              <div className="h-22 bg-black rounded-md flex flex-col items-center justify-center">
                <p className="font-bold">#2</p>
                <p className="font-medium">
                  {data.topLanguages[1].name}
                </p>
              </div>
              <div className="h-24 bg-black rounded-md flex flex-col items-center justify-center">
                <p className="font-bold">#1</p>
                <p className="font-medium">
                  {data.topLanguages[0].name}
                </p>
              </div>
              <div className="h-20 bg-black rounded-md flex flex-col items-center justify-center">
                <p className="font-bold">#3</p>
                <p className="font-medium">
                  {data.topLanguages[2].name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={handleExportImage}
        className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
      >
        Export as Image
      </button>
    </div>
  );
}

export default App;
