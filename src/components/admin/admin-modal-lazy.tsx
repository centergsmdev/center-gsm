"use client";import dynamic from"next/dynamic";export const AdminModal=dynamic(()=>import("./admin-modal").then(module=>module.AdminModal),{ssr:false});
