NFS_SERVER_IP=$(hostname -I | cut -d ' ' -f 1)
export KUBECONFIG=/root/ocp4-workdir/auth/kubeconfig
WORKER_IP=$(oc get no -o wide  --no-headers | awk 'NR==1{print $6}')
NFS_NAMESPACE='nfs-ns'
NEED_APP='yes'


#!/bin/bash -x
yum install -y exportfs
val=$(exportfs -s | grep /export)
if [ -z "$val" ]; then
    yum install -y nfs-utils
    systemctl start nfs-server.service
    systemctl enable nfs-server.service
    mkdir -p /export
    chown -R nobody: /export
    chmod -R 777 /export
    systemctl restart nfs-utils.service
    ip_addr=${WORKER_IP}
    masked_addr=$(awk -F"." '{print $1"."$2"."$3".0"}'<<<$ip_addr)
    echo "/export ${masked_addr}/24(rw,sync,no_all_squash,root_squash)" >> /etc/exports
    exportfs -arv
    firewall-cmd --permanent --add-service=nfs
    firewall-cmd --permanent --add-service=rpc-bind
    firewall-cmd --permanent --add-service=mountd
    firewall-cmd --reload
fi
val=$(exportfs -s | grep /export)
if [ ! -z "$var" ]; then
   echo "Failed to start nfs server"
   exit 1
fi

if systemctl is-active --quiet nfs-server.service; then
    echo "****************NFS server service is running****************"
else
    echo "****************NFS server service is not running. Exiting ****************"
    exit 1
fi


oc new-project ${NFS_NAMESPACE}
yum install git -y
yum install firewalld -y
rm -rf nfs-subdir-external-provisioner
git clone https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner.git
cd nfs-subdir-external-provisioner
# # Set the subject of the RBAC objects to the current namespace where the provisioner is being deployed
NAMESPACE=${NFS_NAMESPACE}
sed -i'' "s/namespace:.*/namespace: $NAMESPACE/g" ./deploy/rbac.yaml ./deploy/deployment.yaml
#oc delete -f deploy/rbac.yaml
oc create -f deploy/rbac.yaml
oc adm policy add-scc-to-user hostmount-anyuid system:serviceaccount:$NAMESPACE:nfs-client-provisioner

host_ip=${NFS_SERVER_IP} #$(hostname -i)(where nfs server up)
cat >nfs-provisioner.yaml <<EOL
kind: Deployment
apiVersion: apps/v1
metadata:
  name: nfs-client-provisioner
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nfs-client-provisioner
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: nfs-storage-provisioner
            - name: NFS_SERVER
              value: ${host_ip}
            - name: NFS_PATH
              value: /export
      volumes:
        - name: nfs-client-root
          nfs:
            server: ${host_ip}
            path: /export
EOL

oc create -f nfs-provisioner.yaml

cat >nfs-storage.yaml<<EOL
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
  name: nfs
provisioner: nfs-storage-provisioner
reclaimPolicy: Delete
volumeBindingMode: Immediate
EOL

oc create -f nfs-storage.yaml

rm -rf nfs-storage.yaml
rm -rf nfs-provisioner.yaml
rm -rf nfs-subdir-external-provisioner




echo "Waiting for NFS deployment to be available"
if oc wait --namespace=${NFS_NAMESPACE} --for=condition=available deployment/nfs-client-provisioner --timeout=15m; then 
  echo "**************** NFS deployment available ****************"
  oc get all -n ${NFS_NAMESPACE}
else
  echo "Some problem with setting up NFS ... try debugging"
  exit 1
fi
