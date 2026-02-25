import svgPaths from "./svg-vkzmdg71hr";

function Group1() {
  return (
    <div className="h-[40.509px] relative shrink-0 w-[141.288px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 141.288 40.5088">
        <g id="Group 1">
          <path d={svgPaths.p1ad23500} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p2152faf0} fill="var(--fill-0, black)" id="Vector_2" />
          <path d={svgPaths.p3bfc5d00} fill="var(--fill-0, #62C069)" id="Vector_3" />
          <path d={svgPaths.p13802480} fill="var(--fill-0, black)" id="Vector_4" />
          <path d={svgPaths.p2d83e00} fill="var(--fill-0, black)" id="Vector_5" />
          <path d={svgPaths.p1f946a00} fill="var(--fill-0, black)" id="Vector_6" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="h-[19.647px] relative w-[103px]" data-name="Group">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 103 19.6467">
        <g id="Group">
          <path d={svgPaths.p2426fe80} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p16489200} fill="var(--fill-0, black)" id="Vector_2" />
          <path d={svgPaths.p179d2d00} fill="var(--fill-0, black)" id="Vector_3" />
          <path d={svgPaths.p3caee400} fill="var(--fill-0, black)" id="Vector_4" />
          <path d={svgPaths.p37480d80} fill="var(--fill-0, black)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function Group3() {
  return (
    <div className="h-[10.352px] ml-[17.5px] relative w-[68.155px]" data-name="Group">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 68.1545 10.3524">
        <g id="Group">
          <path d={svgPaths.p329a8c00} fill="var(--fill-0, #62C069)" id="Vector" />
          <path d={svgPaths.p3eee780} fill="var(--fill-0, #62C069)" id="Vector_2" />
          <path d={svgPaths.p9536100} fill="var(--fill-0, #62C069)" id="Vector_3" />
          <path d={svgPaths.p111b2d00} fill="var(--fill-0, #62C069)" id="Vector_4" />
          <path d={svgPaths.p2001f500} fill="var(--fill-0, #62C069)" id="Vector_5" />
          <path d={svgPaths.p11066ae0} fill="var(--fill-0, #62C069)" id="Vector_6" />
          <path d={svgPaths.p181d800} fill="var(--fill-0, #62C069)" id="Vector_7" />
          <path d={svgPaths.p33de5780} fill="var(--fill-0, #62C069)" id="Vector_8" />
          <path d={svgPaths.p2430a300} fill="var(--fill-0, #62C069)" id="Vector_9" />
          <path d={svgPaths.p707e100} fill="var(--fill-0, #62C069)" id="Vector_10" />
          <path d={svgPaths.p7fd9e00} fill="var(--fill-0, #62C069)" id="Vector_11" />
          <path d={svgPaths.p18504300} fill="var(--fill-0, #62C069)" id="Vector_12" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="flex flex-col gap-[1px] items-start relative shrink-0" data-name="Group">
      <Group2 />
      <Group3 />
    </div>
  );
}

export default function Frame() {
  return (
    <div className="content-stretch flex gap-[16px] items-end relative size-full">
      <Group1 />
      <div className="h-[29.5px] relative shrink-0 w-0">
        <div className="absolute inset-[0_-0.13px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 0.25 29.5">
            <path d="M0.125 0V29.5" id="Vector 6" stroke="var(--stroke-0, black)" strokeWidth="0.25" />
          </svg>
        </div>
      </div>
      <Group />
    </div>
  );
}