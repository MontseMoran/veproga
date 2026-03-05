import React from "react";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation("admin");

  return (
    <div>
      <h1>{t("admin_panel")}</h1>
      <p>{t("admin_choose_section")}</p>
    </div>
  );
}
