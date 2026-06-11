import React, { useMemo, useState } from "react";

type CountryFlagSize = "xs" | "sm" | "md" | "lg" | "xl";

interface CountryFlagProps {
  flag?: string;
  flagUrl?: string;
  countryName?: string;
  size?: CountryFlagSize;
  className?: string;
}

const sizeClasses: Record<CountryFlagSize, { wrapper: string; image: string; emoji: string }> = {
  xs: { wrapper: "h-3.5 w-5", image: "h-3.5 w-5", emoji: "text-xs" },
  sm: { wrapper: "h-4 w-6", image: "h-4 w-6", emoji: "text-base" },
  md: { wrapper: "h-5 w-7", image: "h-5 w-7", emoji: "text-2xl" },
  lg: { wrapper: "h-7 w-10", image: "h-7 w-10", emoji: "text-4xl" },
  xl: { wrapper: "h-12 w-16", image: "h-12 w-16", emoji: "text-6xl" },
};

function isRenderableFlagUrl(value?: string) {
  return Boolean(value && /^(https?:\/\/|\/|data:image\/)/i.test(value.trim()));
}

export default function CountryFlag({ flag, flagUrl, countryName, size = "sm", className = "" }: CountryFlagProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedFlagUrl = useMemo(() => {
    const candidate = flagUrl?.trim() || (isRenderableFlagUrl(flag) ? flag?.trim() : "");
    return candidate || "";
  }, [flag, flagUrl]);
  const canRenderImage = normalizedFlagUrl && !imageFailed;
  const fallbackFlag = flag && !isRenderableFlagUrl(flag) ? flag : "🌐";
  const classes = sizeClasses[size];

  return (
    <span className={`inline-flex shrink-0 items-center justify-center align-middle leading-none ${classes.wrapper} ${className}`}>
      {canRenderImage ? (
        <img
          src={normalizedFlagUrl}
          alt={countryName ? `${countryName} flag` : "Country flag"}
          className={`${classes.image} rounded-[2px] border border-black/10 object-cover shadow-sm`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={`${classes.emoji} leading-none`} role="img" aria-label={countryName ? `${countryName} flag` : "Country flag"}>
          {fallbackFlag}
        </span>
      )}
    </span>
  );
}
