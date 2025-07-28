import { useParams } from "react-router-dom"

export default function ProfilePage(){
    const params = useParams<{profileId: string}>();
    return (
        <div>
            <h1>Profile {params.profileId}</h1>
            
        </div>
    );
}