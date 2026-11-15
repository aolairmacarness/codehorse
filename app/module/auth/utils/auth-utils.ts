"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {headers} from "next/headers";


export const requireAuth = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return session;
}
export const requireNoAuth = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) {
        redirect("/dashboard");
    }
    return session
}

export const logout = async () => {
    await auth.api.signOut({
        headers: await headers(),
    });
    redirect("/login");
}