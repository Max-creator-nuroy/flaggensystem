import {NavLink, Outlet} from "react-router-dom"

export default function ProfilesPage() {
    const profiles  = [1,2,3,4,5,6];

    return (
        <div>
            {profiles.map((profile) => (
                <NavLink key={profile} to={'/profilesPage/' + profile}
                className={({isActive}) =>{
                    return isActive ? "text-red-700" : "";
                }}>
                    Profile {profile}
                </NavLink>

            ))};
            <Outlet />
        </div>
    )
}